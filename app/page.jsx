"use client";

import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const teacherEmail = process.env.NEXT_PUBLIC_TEACHER_EMAIL || "John.ssmith2745@gmail.com";

const programs = [
  {
    id: "resume",
    title: "Resume Builder Boot Camp",
    status: "Apply now",
    short: "Build a strong first resume with guided writing, examples, and feedback.",
    description:
      "This 3-day boot camp helps students identify their strengths, organize school activities and work experience, write strong bullet points, and finish with a clean resume draft. Students meet for 3 hours each day and leave with a document they can keep improving.",
    schedule: "3 days",
    sessions: "3 live sessions",
    time: "3 hours per day",
    seats: 8,
    result: "Finished first resume draft",
    image:
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=900&q=80",
    tags: ["Resumes", "Career Skills", "Portfolio"]
  },
  {
    id: "essays",
    title: "College Essay Studio",
    status: "Apply now",
    short: "Plan, draft, revise, and polish main college essays with optional supplementals.",
    description:
      "This 2-week writing program guides students through brainstorming, outlining, drafting, revising, and polishing their main college essay. Students meet 3 hours per day. If a student finishes early, the remaining time can be used for supplemental essays.",
    schedule: "2 weeks",
    sessions: "10 live sessions",
    time: "3 hours per day",
    seats: 10,
    result: "Main essay polished",
    image:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
    tags: ["College Essays", "Writing", "Admissions"]
  }
];

export default function Page() {
  const [role, setRole] = useState("student");
  const [studentAuthMode, setStudentAuthMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [applications, setApplications] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [activeProgramId, setActiveProgramId] = useState(null);
  const [pendingApplyProgramId, setPendingApplyProgramId] = useState(null);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [rosterProgramId, setRosterProgramId] = useState(null);

  const activeProgram = useMemo(
    () => programs.find((program) => program.id === activeProgramId),
    [activeProgramId]
  );
  const rosterProgram = useMemo(
    () => programs.find((program) => program.id === rosterProgramId),
    [rosterProgramId]
  );
  const pendingApplyProgram = useMemo(
    () => programs.find((program) => program.id === pendingApplyProgramId),
    [pendingApplyProgramId]
  );
  const isTeacher = user && user.email?.toLowerCase() === teacherEmail.toLowerCase();
  const approvedApplications = applications.filter((item) => item.approved);

  useEffect(() => {
    document.body.classList.toggle("auth-mode", !user);
    document.body.classList.toggle("teacher-mode", Boolean(isTeacher));
  }, [user, isTeacher]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setMessage("Supabase is not configured yet. Add the Vercel environment variables before deploying.");
      setIsError(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user || null;
      setUser(sessionUser);
      if (sessionUser) loadData(sessionUser);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user || null;
      setUser(sessionUser);
      if (sessionUser) loadData(sessionUser);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadData(sessionUser = user) {
    if (!supabase || !sessionUser) return;
    setMessage("");
    setIsError(false);

    const teacher = sessionUser.email?.toLowerCase() === teacherEmail.toLowerCase();
    const applicationQuery = supabase
      .from("program_applications")
      .select("*")
      .order("created_at", { ascending: true });
    const ratingQuery = supabase
      .from("program_ratings")
      .select("program_id, student_email, rating, updated_at")
      .order("updated_at", { ascending: false });

    if (!teacher) {
      applicationQuery.eq("student_id", sessionUser.id);
      ratingQuery.eq("student_id", sessionUser.id);
    }

    const [{ data: appRows, error: appError }, { data: ratingRows, error: ratingError }] = await Promise.all([
      applicationQuery,
      ratingQuery
    ]);

    if (appError || ratingError) {
      setMessage("Supabase tables are not ready yet. Run supabase/schema.sql in the Supabase SQL Editor.");
      setIsError(true);
      return;
    }

    setApplications(appRows || []);
    setRatings(ratingRows || []);
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!supabase) return;

    const cleanEmail = email.trim().toLowerCase();
    setMessage("");
    setIsError(false);

    if (role === "teacher" && cleanEmail !== teacherEmail.toLowerCase()) {
      setMessage(`Teacher access is limited to ${teacherEmail}.`);
      setIsError(true);
      return;
    }

    if (role === "student") {
      if (studentAuthMode === "signup") {
        const cleanName = fullName.trim();

        if (!cleanName) {
          setMessage("Please enter the student's full name.");
          setIsError(true);
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName
            }
          }
        });

        if (signUpError) {
          setMessage(signUpError.message);
          setIsError(true);
          return;
        }

        if (!signUpData.session) {
          setMessage("Account created. Use the Log in tab with this same email and password.");
          setIsError(false);
          setStudentAuthMode("login");
          return;
        }

        setUser(signUpData.user);
        await loadData(signUpData.user);
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (signInError) {
        setMessage("No student account found with that email and password. Use Sign up first if this is a new student.");
        setIsError(true);
        return;
      }

      setUser(signInData.user);
      await loadData(signInData.user);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) {
      setMessage("Teacher account not found yet. Create this teacher user in Supabase Auth, then sign in here.");
      setIsError(true);
      return;
    }

    setUser(data.user);
    await loadData(data.user);
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setApplications([]);
    setRatings([]);
  }

  function applicationsFor(programId) {
    return applications.filter((item) => item.program_id === programId);
  }

  function hasApplied(programId) {
    return applications.some((item) => item.program_id === programId && item.student_email === user?.email);
  }

  function applicationFor(programId) {
    return applications.find((item) => item.program_id === programId && item.student_email === user?.email);
  }

  function applicationStatus(programId) {
    const application = applicationFor(programId);
    if (!application) return "Apply now";
    return application.approved ? "Approved" : "Pending approval";
  }

  function seatText(program) {
    const signedUp = applicationsFor(program.id).length;
    return `${Math.max(program.seats - signedUp, 0)} of ${program.seats} open`;
  }

  function averageRating(programId) {
    const programRatings = ratings.filter((item) => item.program_id === programId);
    if (!programRatings.length) return "No ratings yet";
    const average = programRatings.reduce((sum, item) => sum + item.rating, 0) / programRatings.length;
    return `${average.toFixed(1)} / 5 average`;
  }

  async function applyToProgram(programId) {
    if (!user || !supabase) return;
    if (hasApplied(programId)) {
      setPendingApplyProgramId(null);
      setActiveProgramId(programId);
      return;
    }

    const studentName = user.user_metadata?.full_name || fullName.trim() || user.email;
    const applicationPayload = {
      program_id: programId,
      student_id: user.id,
      student_email: user.email,
      student_name: studentName,
      approved: false
    };
    let { error } = await supabase.from("program_applications").insert(applicationPayload);

    if (error?.code === "42703") {
      const { error: legacyError } = await supabase.from("program_applications").insert({
        program_id: programId,
        student_id: user.id,
        student_email: user.email
      });
      error = legacyError;
    }

    if (error) {
      if (error.code === "23505") {
        setPendingApplyProgramId(null);
        setActiveProgramId(programId);
        await loadData(user);
        return;
      }
      setMessage(error.message);
      setIsError(true);
      return;
    }
    setPendingApplyProgramId(null);
    setActiveProgramId(programId);
    await loadData(user);
  }

  async function approveApplication(application) {
    if (!supabase || !isTeacher) return;

    const { error } = await supabase
      .from("program_applications")
      .update({
        approved: true,
        approved_at: new Date().toISOString()
      })
      .eq("id", application.id);

    if (error) {
      setMessage("Approval needs the updated Supabase policy. Run supabase/schema.sql in the SQL Editor, then try again.");
      setIsError(true);
      return;
    }

    await loadData(user);
  }

  function requestApply(programId) {
    if (hasApplied(programId)) {
      setActiveProgramId(programId);
      return;
    }
    setPendingApplyProgramId(programId);
  }

  async function rateProgram(value) {
    if (!user || !activeProgramId || !supabase) return;
    const { error } = await supabase.from("program_ratings").upsert(
      {
        program_id: activeProgramId,
        student_id: user.id,
        student_email: user.email,
        rating: value,
        updated_at: new Date().toISOString()
      },
      { onConflict: "program_id,student_id" }
    );
    if (error) {
      setMessage(error.message);
      setIsError(true);
      return;
    }
    await loadData(user);
  }

  const currentRating = ratings.find(
    (item) => item.program_id === activeProgramId && item.student_email === user?.email
  )?.rating;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, index) => <span key={index}></span>)}
          </div>
          <span>edcubed</span>
        </div>
        <nav className="nav" aria-label="Main navigation">
          <a href="#"><span className="nav-icon">O</span>Overview</a>
          <a href="#"><span className="nav-icon">B</span>Bookings</a>
          <a href="#"><span className="nav-icon">C</span>Classroom</a>
          <a className="active" href="#"><span className="nav-icon">P</span>Programs</a>
          <a href="#"><span className="nav-icon">D</span>Docs</a>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="ghost-button reset-button" type="button" onClick={() => loadData(user)}>
            Refresh
          </button>
          <div className="top-actions">
            <button className="icon-button bell-button" type="button" aria-label="Notifications">
              <svg className="bell-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"></path>
                <path d="M13.7 21a2 2 0 0 1-3.4 0"></path>
              </svg>
              <span className="dot"></span>
            </button>
            <button className="avatar" type="button" aria-label="Account">JS</button>
          </div>
        </header>

        {!user && (
          <section className="auth-panel" aria-labelledby="authTitle">
            <div>
              <p className="eyebrow">Programs access</p>
              <h1 id="authTitle">Sign in to edcubed programs</h1>
              <p className="muted">Students can apply and rate programs. Teachers can view rosters for each program.</p>
            </div>
            <form className="auth-card" onSubmit={handleLogin}>
              <div className="role-toggle" role="tablist" aria-label="Account type">
                <button className={`role-tab ${role === "student" ? "active" : ""}`} type="button" onClick={() => { setRole("student"); setMessage(""); }}>Student</button>
                <button className={`role-tab ${role === "teacher" ? "active" : ""}`} type="button" onClick={() => { setRole("teacher"); setMessage(""); }}>Teacher</button>
              </div>
              {role === "student" && (
                <div className="role-toggle student-auth-toggle" role="tablist" aria-label="Student sign in mode">
                  <button className={`role-tab ${studentAuthMode === "login" ? "active" : ""}`} type="button" onClick={() => { setStudentAuthMode("login"); setMessage(""); }}>Log in</button>
                  <button className={`role-tab ${studentAuthMode === "signup" ? "active" : ""}`} type="button" onClick={() => { setStudentAuthMode("signup"); setMessage(""); }}>Sign up</button>
                </div>
              )}
              <label>
                Email
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={role === "teacher" ? teacherEmail : "student@example.com"} required />
              </label>
              {role === "student" && studentAuthMode === "signup" && (
                <label>
                  Full name
                  <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Student full name" required />
                </label>
              )}
              <label>
                Password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" required />
              </label>
              <p className="hint">
                {role === "teacher"
                  ? "Use the teacher account created in Supabase Auth."
                  : studentAuthMode === "signup"
                    ? "Create a student account once. The email and password are saved for future logins."
                    : "Log in with the same email and password used during student sign up."}
              </p>
              {message && <p className={`status-message ${isError ? "error" : ""}`}>{message}</p>}
              <button className="primary-button" type="submit">
                {role === "student" && studentAuthMode === "signup" ? "Create account ->" : "Log in ->"}
              </button>
            </form>
          </section>
        )}

        {user && !isTeacher && (
          <section className="dashboard dashboard-option-two" aria-labelledby="studentTitle">
            <div className="dashboard-grid">
              <div className="catalog-column">
                <div className="catalog-head">
                  <div>
                    <p className="eyebrow">Program catalog</p>
                    <h1 id="studentTitle">Choose a live support program</h1>
                    <p className="muted">Apply with your student account, meet live with John Smith, and rate the program after you finish.</p>
                  </div>
                  <button className="ghost-button" type="button" onClick={logout}>Sign out</button>
                </div>
                {message && <p className={`status-message ${isError ? "error" : ""}`}>{message}</p>}
                <div className="filters" aria-label="Program categories">
                  <button className="active" type="button">All</button>
                  <button type="button">Writing</button>
                  <button type="button">College</button>
                  <button type="button">Career</button>
                </div>
                <div className="program-list">
                  {programs.map((program) => (
                    <article className="program-row" key={program.id}>
                      <img src={program.image} alt="" />
                      <div className="program-row-copy">
                        <div className="tags compact-tags">
                          <span className="green-tag">{applicationStatus(program.id)}</span>
                          <span>{program.sessions}</span>
                          <span>{program.time}</span>
                        </div>
                        <h2>{program.title}</h2>
                        <p>{program.short}</p>
                        <div className="meta-grid">
                          <span><strong>{program.schedule}</strong> schedule</span>
                          <span><strong>{seatText(program)}</strong> seats</span>
                          <span><strong>{averageRating(program.id)}</strong></span>
                        </div>
                      </div>
                      <div className="row-actions">
                        <button className="primary-button" type="button" onClick={() => requestApply(program.id)}>
                          {hasApplied(program.id) ? "Applied" : "Apply"}
                        </button>
                        <button className="outline-button" type="button" onClick={() => setActiveProgramId(program.id)}>
                          View
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="insight-panel" aria-label="Program summary">
                <article className="summary-card">
                  <span className="summary-icon">2</span>
                  <div>
                    <strong>Active programs</strong>
                    <p>Resume support and college essay support are open for applications.</p>
                  </div>
                </article>
                <article className="summary-card teacher-summary">
                  <span className="avatar large-avatar">JS</span>
                  <div>
                    <strong>John Smith</strong>
                    <p>University of Michigan, M.Ed. Certified writing tutor and youth career coach.</p>
                    <button className="teacher-link small-link" type="button" onClick={() => setTeacherOpen(true)}>
                      View profile
                    </button>
                  </div>
                </article>
                <article className="summary-card">
                  <span className="summary-icon">{approvedApplications.length}</span>
                  <div>
                    <strong>Notifications</strong>
                    <p>
                      {approvedApplications.length
                        ? `You're in for ${programs.find((program) => program.id === approvedApplications[0].program_id)?.title || "your program"}.`
                        : "Approved applications will show here."}
                    </p>
                  </div>
                </article>
              </aside>
            </div>
          </section>
        )}

        {isTeacher && (
          <section className="dashboard dashboard-option-two teacher-dashboard" aria-labelledby="teacherTitle">
            <div className="dashboard-grid">
              <div className="catalog-column">
                <div className="catalog-head">
                  <div>
                    <p className="eyebrow">Teacher portal</p>
                    <h1 id="teacherTitle">Program Rosters</h1>
                    <p className="muted">Program descriptions stay hidden here. Open a roster to see student emails.</p>
                  </div>
                  <button className="ghost-button" type="button" onClick={logout}>Sign out</button>
                </div>
                {message && <p className={`status-message ${isError ? "error" : ""}`}>{message}</p>}
                <div className="program-list">
                  {programs.map((program) => {
                    const roster = applicationsFor(program.id);
                    return (
                      <article className="program-row teacher-row" key={program.id}>
                        <img src={program.image} alt="" />
                        <div className="program-row-copy">
                          <div className="tags compact-tags">
                            <span className="green-tag">{roster.length} applied</span>
                            <span>{roster.filter((student) => student.approved).length} approved</span>
                            <span>{averageRating(program.id)}</span>
                          </div>
                          <h2>{program.title}</h2>
                          <p>{roster.length ? "Open the roster to see student emails." : "No applications yet."}</p>
                        </div>
                        <div className="row-actions">
                          <button className="primary-button" type="button" onClick={() => setRosterProgramId(program.id)}>
                            View roster
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <aside className="insight-panel" aria-label="Roster summary">
                <article className="summary-card">
                  <span className="summary-icon">{applications.length}</span>
                  <div>
                    <strong>Total applications</strong>
                    <p>Across all active programs.</p>
                  </div>
                </article>
                <article className="summary-card">
                  <span className="summary-icon">@</span>
                  <div>
                    <strong>Roster access</strong>
                    <p>Teachers see only the program names and applicant emails.</p>
                  </div>
                </article>
              </aside>
            </div>
          </section>
        )}
      </main>

      {activeProgram && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modalTitle" onMouseDown={(event) => event.target === event.currentTarget && setActiveProgramId(null)}>
          <div className="modal">
            <button className="close-button" type="button" aria-label="Close" onClick={() => setActiveProgramId(null)}>x</button>
            <span className="status-badge">{applicationStatus(activeProgram.id)}</span>
            <div className="modal-head">
              <img className="modal-image" src={activeProgram.image} alt="" />
              <div>
                <h2 id="modalTitle">{activeProgram.title}</h2>
                <p>{activeProgram.description}</p>
              </div>
            </div>
            <div className="detail-grid">
              <article className="detail-card"><span>Schedule</span><strong>{activeProgram.schedule}</strong></article>
              <article className="detail-card"><span>Sessions</span><strong>{activeProgram.sessions}</strong></article>
              <article className="detail-card"><span>Daily time</span><strong>{activeProgram.time}</strong></article>
              <article className="detail-card"><span>Seats</span><strong>{seatText(activeProgram)}</strong></article>
            </div>
            <section className="teacher-box">
              <div>
                <p className="eyebrow">Teacher</p>
                <button className="teacher-link" type="button" onClick={() => setTeacherOpen(true)}>John Smith</button>
              </div>
              <p>Click the teacher name to view credentials and accomplishments.</p>
            </section>
            <div className="tags">{activeProgram.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <div className="rating-box">
              <p className="eyebrow">Finished the program?</p>
              <div className="rating-row" aria-label="Rate this program">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button className={currentRating === value ? "active" : ""} key={value} type="button" onClick={() => rateProgram(value)}>{value}</button>
                ))}
              </div>
              <p className="hint">{currentRating ? `You rated this program ${currentRating} out of 5.` : "Students can rate after completing the program."}</p>
            </div>
            <div className="modal-actions">
              <button className="primary-button" type="button" onClick={() => requestApply(activeProgram.id)}>{hasApplied(activeProgram.id) ? "Application sent" : "Apply now ->"}</button>
              <button className="outline-button" type="button" onClick={() => setActiveProgramId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {teacherOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="teacherModalTitle" onMouseDown={(event) => event.target === event.currentTarget && setTeacherOpen(false)}>
          <div className="small-modal">
            <button className="close-button" type="button" aria-label="Close" onClick={() => setTeacherOpen(false)}>x</button>
            <h2 id="teacherModalTitle">John Smith</h2>
            <dl className="profile-list">
              <div><dt>University</dt><dd>University of Michigan</dd></div>
              <div><dt>Age</dt><dd>29</dd></div>
              <div><dt>Education</dt><dd>Master's degree in Education</dd></div>
              <div><dt>Credentials</dt><dd>Certified writing tutor and youth career coach</dd></div>
              <div><dt>Accomplishments</dt><dd>Helped 150+ students draft resumes, college essays, and scholarship applications.</dd></div>
            </dl>
          </div>
        </div>
      )}

      {pendingApplyProgram && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="applyConfirmTitle" onMouseDown={(event) => event.target === event.currentTarget && setPendingApplyProgramId(null)}>
          <div className="small-modal">
            <button className="close-button" type="button" aria-label="Close" onClick={() => setPendingApplyProgramId(null)}>x</button>
            <p className="eyebrow">Confirm application</p>
            <h2 id="applyConfirmTitle">Apply to {pendingApplyProgram.title}?</h2>
            <p className="muted">This will send your email to the teacher roster for this program.</p>
            <div className="modal-actions">
              <button className="primary-button" type="button" onClick={() => applyToProgram(pendingApplyProgram.id)}>Yes, apply</button>
              <button className="outline-button" type="button" onClick={() => setPendingApplyProgramId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {rosterProgram && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rosterTitle" onMouseDown={(event) => event.target === event.currentTarget && setRosterProgramId(null)}>
          <div className="modal">
            <button className="close-button" type="button" aria-label="Close" onClick={() => setRosterProgramId(null)}>x</button>
            <h2 id="rosterTitle">{rosterProgram.title} roster</h2>
            <div className="roster-list">
              {applicationsFor(rosterProgram.id).length ? (
                applicationsFor(rosterProgram.id).map((student) => (
                  <div className="roster-item" key={`${student.program_id}-${student.student_email}`}>
                    <div>
                      <strong>{student.student_name || student.student_email}</strong>
                      <span>{student.student_email}</span>
                    </div>
                    {student.approved ? (
                      <span>Approved</span>
                    ) : (
                      <button className="primary-button" type="button" onClick={() => approveApplication(student)}>
                        Approve
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="roster-item"><strong>No students yet</strong><span>Waiting</span></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
