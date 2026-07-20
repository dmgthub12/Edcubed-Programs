"use client";

import { useEffect, useState } from "react";
import { createRoleSupabaseClient, isSupabaseConfigured } from "../lib/supabaseClient";

const teacherEmail = process.env.NEXT_PUBLIC_TEACHER_EMAIL || "John.ssmith2745@gmail.com";
const statuses = ["under_review", "approved", "waitlisted", "not_accepted"];
const statusText = {
  under_review: "Under review",
  approved: "Approved",
  waitlisted: "Waitlisted",
  not_accepted: "Not accepted"
};

const programs = [
  {
    id: "resume",
    title: "Resume Builder Boot Camp",
    short: "Build a strong first resume with guided writing, examples, and feedback.",
    description:
      "This 3-day boot camp helps students identify their strengths, organize school activities and work experience, write strong bullet points, and finish with a clean resume draft. Students meet for 3 hours each day and leave with a document they can keep improving.",
    schedule: "3 days",
    sessions: "3 live sessions",
    time: "3 hours per day",
    seats: 8,
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=900&q=80",
    tags: ["Resumes", "Career Skills", "Portfolio"]
  },
  {
    id: "essays",
    title: "College Essay Studio",
    short: "Plan, draft, revise, and polish main college essays with optional supplementals.",
    description:
      "This 2-week writing program guides students through brainstorming, outlining, drafting, revising, and polishing their main college essay. Students meet 3 hours per day. If a student finishes early, the remaining time can be used for supplemental essays.",
    schedule: "2 weeks",
    sessions: "10 live sessions",
    time: "3 hours per day",
    seats: 10,
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
    tags: ["College Essays", "Writing", "Admissions"]
  }
];

const lessonPlans = {
  resume: [
    ["August 5, 2026", "Build a resume outline, choose sections, and collect activities, awards, and experience.", "School activity list, awards, volunteer/work history, laptop or notebook"],
    ["August 6, 2026", "Write strong bullet points and turn experience into clear accomplishment statements.", "Resume outline from Day 1, examples of past projects or responsibilities"],
    ["August 7, 2026", "Polish formatting, revise wording, and finish a clean first resume draft.", "Current draft, teacher feedback, Google Docs or Word access"]
  ],
  essays: [
    ["August 10, 2026", "Brainstorm essay topics and choose the strongest personal story direction.", "College list, Common App prompts, notebook or Google Doc"],
    ["August 11, 2026", "Create a working outline and write the first opening section.", "Brainstorm notes, selected prompt, laptop"],
    ["August 12, 2026", "Draft the body of the main essay with clear scenes and reflection.", "Essay outline, teacher comments"],
    ["August 13, 2026", "Revise structure, strengthen voice, and remove unclear sections.", "Full draft, revision checklist"],
    ["August 14, 2026", "Polish the main essay and identify supplemental essay opportunities.", "Revised draft, college supplemental prompts"],
    ["August 17, 2026", "Start supplemental essays or deepen the main essay if more revision is needed.", "College list, supplement prompts, main essay draft"],
    ["August 18, 2026", "Draft one or two supplemental responses with specific school details.", "School research notes, supplement drafts"],
    ["August 19, 2026", "Revise supplementals and check that each answer sounds specific and personal.", "Supplement drafts, teacher feedback"],
    ["August 20, 2026", "Final polish for grammar, flow, word count, and submission readiness.", "Final essay set, application portal requirements"],
    ["August 21, 2026", "Complete final review and create a next-step checklist for remaining applications.", "Final drafts, checklist, application deadlines"]
  ]
};

const blankInfo = { meet_url: "", meet_code: "", homework: "" };
const studentSupabase = createRoleSupabaseClient("student");
const teacherSupabase = createRoleSupabaseClient("teacher");

function normalizedStatus(app) {
  return app?.status || (app?.approved ? "approved" : "under_review");
}

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
  const [meetingInfo, setMeetingInfo] = useState([]);
  const [activeProgramId, setActiveProgramId] = useState(null);
  const [applyProgramId, setApplyProgramId] = useState(null);
  const [meetingProgramId, setMeetingProgramId] = useState(null);
  const [rosterProgramId, setRosterProgramId] = useState(null);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [meetingDrafts, setMeetingDrafts] = useState({});

  const activeSupabase = role === "teacher" ? teacherSupabase : studentSupabase;
  const isTeacher = user?.email?.toLowerCase() === teacherEmail.toLowerCase();
  const activeProgram = programs.find((program) => program.id === activeProgramId);
  const applyProgram = programs.find((program) => program.id === applyProgramId);
  const meetingProgram = programs.find((program) => program.id === meetingProgramId);
  const rosterProgram = programs.find((program) => program.id === rosterProgramId);
  const approvedApplications = applications.filter((app) => normalizedStatus(app) === "approved");

  useEffect(() => {
    document.body.classList.toggle("auth-mode", !user);
    document.body.classList.toggle("teacher-mode", Boolean(isTeacher));
  }, [user, isTeacher]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      show("Supabase is not configured yet. Add the Vercel environment variables before deploying.", true);
      return;
    }
    setUser(null);
    setApplications([]);
    setRatings([]);
    setMeetingInfo([]);
    activeSupabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user || null;
      setUser(sessionUser);
      if (sessionUser) loadData(sessionUser, activeSupabase);
    });
    const { data: listener } = activeSupabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user || null;
      setUser(sessionUser);
      if (sessionUser) loadData(sessionUser, activeSupabase);
    });
    return () => listener.subscription.unsubscribe();
  }, [role]);

  useEffect(() => {
    if (!user) return undefined;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadData(user, activeSupabase);
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [user, activeSupabase]);

  function show(text, error = false) {
    setMessage(text);
    setIsError(error);
  }

  async function loadData(sessionUser = user, client = activeSupabase) {
    if (!client || !sessionUser) return;
    show("");
    const teacher = sessionUser.email?.toLowerCase() === teacherEmail.toLowerCase();
    const applicationQuery = client.from("program_applications").select("*").order("created_at", { ascending: true });
    const ratingQuery = client.from("program_ratings").select("program_id, student_email, rating, updated_at").order("updated_at", { ascending: false });
    if (!teacher) {
      applicationQuery.eq("student_id", sessionUser.id);
      ratingQuery.eq("student_id", sessionUser.id);
    }
    const [apps, ratingRows, infoRows] = await Promise.all([
      applicationQuery,
      ratingQuery,
      client.from("program_meeting_info").select("*").order("program_id", { ascending: true })
    ]);
    if (apps.error || ratingRows.error) {
      show("Supabase tables are not ready yet. Run supabase/schema.sql in the Supabase SQL Editor.", true);
      return;
    }
    setApplications(apps.data || []);
    setRatings(ratingRows.data || []);
    setMeetingInfo(infoRows.error ? [] : infoRows.data || []);
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!activeSupabase) return;
    const cleanEmail = email.trim().toLowerCase();
    show("");

    if (role === "teacher" && cleanEmail !== teacherEmail.toLowerCase()) {
      show(`Teacher access is limited to ${teacherEmail}.`, true);
      return;
    }

    if (role === "student" && studentAuthMode === "signup") {
      if (!fullName.trim()) return show("Please enter the student's full name.", true);
      const { data, error } = await activeSupabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: fullName.trim() } }
      });
      if (error) return show(error.message, true);
      if (!data.session) {
        setStudentAuthMode("login");
        return show("Account created. Use the Log in tab with this same email and password.");
      }
      setUser(data.user);
      await loadData(data.user);
      return;
    }

    const { data, error } = await activeSupabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) {
      show(role === "teacher" ? "Teacher account not found yet. Create this teacher user in Supabase Auth, then sign in here." : "No student account found with that email and password. Use Sign up first if this is a new student.", true);
      return;
    }
    setUser(data.user);
    await loadData(data.user);
  }

  async function logout() {
    if (activeSupabase) await activeSupabase.auth.signOut();
    setUser(null);
    setApplications([]);
    setRatings([]);
    setMeetingInfo([]);
  }

  function applicationsFor(programId) {
    return applications.filter((app) => app.program_id === programId);
  }

  function applicationFor(programId) {
    return applications.find((app) => app.program_id === programId && app.student_email === user?.email);
  }

  function hasApplied(programId) {
    return Boolean(applicationFor(programId));
  }

  function isApprovedFor(programId) {
    return normalizedStatus(applicationFor(programId)) === "approved";
  }

  function applicationStatus(programId) {
    const app = applicationFor(programId);
    return app ? statusText[normalizedStatus(app)] : "Apply now";
  }

  function infoFor(programId) {
    return { ...blankInfo, ...(meetingInfo.find((info) => info.program_id === programId) || {}), ...(meetingDrafts[programId] || {}) };
  }

  function openMeeting(programId) {
    const info = infoFor(programId);
    setMeetingDrafts((drafts) => ({ ...drafts, [programId]: info }));
    setMeetingProgramId(programId);
  }

  function seatText(program) {
    const open = Math.max(program.seats - applicationsFor(program.id).length, 0);
    return `${open} of ${program.seats} open`;
  }

  function averageRating(programId) {
    const programRatings = ratings.filter((rating) => rating.program_id === programId);
    if (!programRatings.length) return "No ratings yet";
    const average = programRatings.reduce((sum, item) => sum + item.rating, 0) / programRatings.length;
    return `${average.toFixed(1)} / 5 average`;
  }

  async function applyToProgram(programId) {
    if (!user || !activeSupabase) return;
    if (hasApplied(programId)) {
      setApplyProgramId(null);
      setActiveProgramId(programId);
      return;
    }
    const { error } = await activeSupabase.from("program_applications").insert({
      program_id: programId,
      student_id: user.id,
      student_email: user.email,
      student_name: user.user_metadata?.full_name || fullName.trim() || user.email,
      approved: false,
      status: "under_review"
    });
    if (error && error.code !== "23505") return show(error.message, true);
    setApplyProgramId(null);
    setActiveProgramId(programId);
    await loadData(user);
  }

  async function updateApplication(application, status) {
    if (!activeSupabase || !isTeacher) return;
    const { error } = await activeSupabase
      .from("program_applications")
      .update({ status, approved: status === "approved", approved_at: status === "approved" ? new Date().toISOString() : null })
      .eq("id", application.id);
    if (error) return show("Status updates need the updated Supabase policy. Run supabase/schema.sql in the SQL Editor, then try again.", true);
    await loadData(user);
  }

  async function saveStudentNotes(application) {
    const { error } = await activeSupabase
      .from("program_applications")
      .update({ teacher_notes: noteDrafts[application.id] ?? application.teacher_notes ?? "" })
      .eq("id", application.id);
    if (error) return show("Notes need the updated Supabase policy. Run supabase/schema.sql in the SQL Editor, then try again.", true);
    await loadData(user);
  }

  async function saveMeetingInfo(programId) {
    const info = infoFor(programId);
    const { error } = await activeSupabase.from("program_meeting_info").upsert({
      program_id: programId,
      meet_url: info.meet_url || "",
      meet_code: info.meet_code || "",
      homework: info.homework || "",
      updated_at: new Date().toISOString()
    }, { onConflict: "program_id" });
    if (error) return show("Meeting info needs the updated Supabase SQL. Run supabase/schema.sql in the SQL Editor, then try again.", true);
    await loadData(user);
    show("Meeting information saved.");
  }

  async function rateProgram(value) {
    if (!user || !activeProgramId || !activeSupabase) return;
    const { error } = await activeSupabase.from("program_ratings").upsert({
      program_id: activeProgramId,
      student_id: user.id,
      student_email: user.email,
      rating: value,
      updated_at: new Date().toISOString()
    }, { onConflict: "program_id,student_id" });
    if (error) return show(error.message, true);
    await loadData(user);
  }

  function toggleNotes(student) {
    setExpandedStudentId((id) => (id === student.id ? null : student.id));
    setNoteDrafts((drafts) => ({ ...drafts, [student.id]: drafts[student.id] ?? student.teacher_notes ?? "" }));
  }

  const currentRating = ratings.find((rating) => rating.program_id === activeProgramId && rating.student_email === user?.email)?.rating;

  return (
    <div className="app-shell">
      <style>{`
        .program-row{grid-template-columns:172px minmax(0,1fr) 190px}.row-actions{display:grid;gap:10px}.primary-button{text-decoration:none}.primary-button:disabled{border-color:#cdd3ea;background:#dfe4f4;color:#72798b;cursor:default}.modal-actions{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}.meeting-modal{width:min(980px,100%)}.meeting-hero{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:18px;align-items:stretch;margin:22px 0}.meet-card,.homework-box,.meeting-editor,.lesson-card{border:1px solid var(--line);border-radius:8px;background:#fff}.meet-card{display:grid;gap:12px;padding:16px;box-shadow:var(--shadow)}.meet-card p,.homework-box p{margin:0;color:var(--muted);line-height:1.45}.meet-card strong,.meet-card span{display:block}.meeting-editor{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px;margin:18px 0 24px;background:var(--soft)}.meeting-editor .homework-editor{grid-column:1/-1}.meeting-editor textarea,.student-notes-panel textarea{font:inherit;width:100%;min-height:118px;resize:vertical;border:1px solid var(--line);border-radius:8px;padding:13px 14px;background:#fff;color:var(--ink)}.lesson-section{margin-top:22px}.section-heading h3{margin:4px 0 14px;font-size:24px}.lesson-list{display:grid;gap:12px}.lesson-card{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;padding:16px}.lesson-number{display:grid;place-items:center;width:44px;height:44px;border-radius:8px;background:var(--blue-soft);color:var(--blue);font-weight:900}.lesson-card h4{margin:0 0 4px;font-size:20px}.lesson-time{margin:0 0 12px;color:var(--blue);font-weight:800}.lesson-card dl{display:grid;gap:10px;margin:0}.lesson-card dt{color:var(--muted);font-size:13px;font-weight:900;text-transform:uppercase}.lesson-card dd{margin:4px 0 0;color:var(--ink);line-height:1.45}.homework-box{margin-top:18px;padding:18px;background:#fbfcff}.empty-state{color:var(--muted)}.roster-item{flex-wrap:wrap;align-items:center}.roster-main{display:flex;align-items:center;justify-content:space-between;flex:1 1 420px;gap:12px;cursor:pointer}.roster-item span{display:block;color:var(--muted);margin-top:4px}.student-notes-panel{flex:0 0 100%;display:grid;gap:14px;border-top:1px solid var(--line);padding-top:14px}.status-controls{display:flex;flex-wrap:wrap;gap:8px}.status-controls button{border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--muted);padding:8px 10px;font-weight:800}.status-controls button.active{border-color:var(--blue);background:var(--blue-soft);color:var(--blue)}@media(max-width:900px){.program-row{grid-template-columns:1fr}.meeting-hero,.meeting-editor{grid-template-columns:1fr}}
      `}</style>

      <aside className="sidebar">
        <div className="brand"><div className="brand-mark" aria-hidden="true">{Array.from({ length: 9 }).map((_, i) => <span key={i}></span>)}</div><span>edcubed</span></div>
        <nav className="nav" aria-label="Main navigation">
          {["Overview", "Bookings", "Classroom", "Programs", "Docs"].map((item) => <a className={item === "Programs" ? "active" : ""} href="#" key={item}><span className="nav-icon">{item[0]}</span>{item}</a>)}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          {user && <button className="ghost-button reset-button" type="button" onClick={() => loadData(user)}>Refresh</button>}
          <div className="top-actions">
            <button className="icon-button bell-button" type="button" aria-label="Notifications"><svg className="bell-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"></path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path></svg><span className="dot"></span></button>
            <button className="avatar" type="button" aria-label="Account">JS</button>
          </div>
        </header>

        {!user && (
          <section className="auth-panel" aria-labelledby="authTitle">
            <div><p className="eyebrow">Programs access</p><h1 id="authTitle">Sign in to edcubed programs</h1><p className="muted">Students can apply and rate programs. Teachers can view rosters for each program.</p></div>
            <form className="auth-card" onSubmit={handleLogin}>
              <div className="role-toggle" role="tablist" aria-label="Account type">
                <button className={`role-tab ${role === "student" ? "active" : ""}`} type="button" onClick={() => { setRole("student"); show(""); }}>Student</button>
                <button className={`role-tab ${role === "teacher" ? "active" : ""}`} type="button" onClick={() => { setRole("teacher"); show(""); }}>Teacher</button>
              </div>
              {role === "student" && <div className="role-toggle student-auth-toggle" role="tablist" aria-label="Student mode"><button className={`role-tab ${studentAuthMode === "login" ? "active" : ""}`} type="button" onClick={() => setStudentAuthMode("login")}>Log in</button><button className={`role-tab ${studentAuthMode === "signup" ? "active" : ""}`} type="button" onClick={() => setStudentAuthMode("signup")}>Sign up</button></div>}
              <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={role === "teacher" ? teacherEmail : "student@example.com"} required /></label>
              {role === "student" && studentAuthMode === "signup" && <label>Full name<input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Student full name" required /></label>}
              <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" required /></label>
              <p className="hint">{role === "teacher" ? "Use the teacher account created in Supabase Auth." : studentAuthMode === "signup" ? "Create a student account once. The email and password are saved for future logins." : "Log in with the same email and password used during student sign up."}</p>
              {message && <p className={`status-message ${isError ? "error" : ""}`}>{message}</p>}
              <button className="primary-button" type="submit">{role === "student" && studentAuthMode === "signup" ? "Create account ->" : "Log in ->"}</button>
            </form>
          </section>
        )}

        {user && (
          <section className={`dashboard dashboard-option-two ${isTeacher ? "teacher-dashboard" : ""}`}>
            <div className="dashboard-grid">
              <div className="catalog-column">
                <div className="catalog-head">
                  <div>
                    <p className="eyebrow">{isTeacher ? "Teacher portal" : "Program catalog"}</p>
                    <h1>{isTeacher ? "Program Rosters" : "Choose a live support program"}</h1>
                    {isTeacher && <p className="muted">Click a student name to open notes, status controls, and roster details.</p>}
                  </div>
                  <button className="ghost-button" type="button" onClick={logout}>Sign out</button>
                </div>
                {message && <p className={`status-message ${isError ? "error" : ""}`}>{message}</p>}
                {!isTeacher && <div className="filters" aria-label="Program categories">{["All", "Writing", "College", "Career"].map((filter, index) => <button className={index === 0 ? "active" : ""} type="button" key={filter}>{filter}</button>)}</div>}
                <div className="program-list">
                  {programs.map((program) => {
                    const roster = applicationsFor(program.id);
                    return (
                      <article className={`program-row ${isTeacher ? "teacher-row" : ""}`} key={program.id}>
                        <img src={program.image} alt="" />
                        <div className="program-row-copy">
                          <div className="tags compact-tags">
                            {isTeacher ? <><span className="green-tag">{roster.length} applied</span><span>{roster.filter((student) => normalizedStatus(student) === "under_review").length} under review</span><span>{roster.filter((student) => normalizedStatus(student) === "approved").length} approved</span></> : <><span className="green-tag">{applicationStatus(program.id)}</span><span>{program.sessions}</span><span>{program.time}</span></>}
                            <span>{averageRating(program.id)}</span>
                          </div>
                          <h2>{program.title}</h2>
                          <p>{isTeacher ? (roster.length ? "Open the roster to see student details." : "No applications yet.") : program.short}</p>
                          {!isTeacher && <div className="meta-grid"><span><strong>{program.schedule}</strong> schedule</span><span><strong>{seatText(program)}</strong> seats</span><span><strong>{averageRating(program.id)}</strong></span></div>}
                        </div>
                        <div className="row-actions">
                          {isTeacher ? <><button className="primary-button" type="button" onClick={() => setRosterProgramId(program.id)}>View roster</button><button className="outline-button" type="button" onClick={() => openMeeting(program.id)}>Meeting info</button></> : <><button className="primary-button" type="button" onClick={() => hasApplied(program.id) ? setActiveProgramId(program.id) : setApplyProgramId(program.id)}>{hasApplied(program.id) ? "Applied" : "Apply"}</button><button className="outline-button" type="button" onClick={() => setActiveProgramId(program.id)}>View</button>{isApprovedFor(program.id) && <button className="outline-button" type="button" onClick={() => openMeeting(program.id)}>Meeting information</button>}</>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
              <aside className="insight-panel" aria-label="Program summary">
                <article className="summary-card"><span className="summary-icon">{isTeacher ? applications.length : 2}</span><div><strong>{isTeacher ? "Total applications" : "Active programs"}</strong><p>{isTeacher ? "Across all active programs." : "Resume support and college essay support are open for applications."}</p></div></article>
                {!isTeacher && <article className="summary-card teacher-summary"><span className="avatar large-avatar">JS</span><div><strong>John Smith</strong><p>University of Michigan, M.Ed. Certified writing tutor and youth career coach.</p><button className="teacher-link small-link" type="button" onClick={() => setTeacherOpen(true)}>View profile</button></div></article>}
                <article className="summary-card"><span className="summary-icon">{approvedApplications.length}</span><div><strong>{isTeacher ? "Approved" : "Notifications"}</strong><p>{approvedApplications.length ? (isTeacher ? `Approved: ${approvedApplications.length}` : `You're in for ${programs.find((program) => program.id === approvedApplications[0].program_id)?.title || "your program"}.`) : "Approved applications will show here."}</p>{!isTeacher && approvedApplications.length > 0 && <button className="teacher-link small-link" type="button" onClick={() => openMeeting(approvedApplications[0].program_id)}>Meeting information</button>}</div></article>
              </aside>
            </div>
          </section>
        )}
      </main>

      {activeProgram && <ProgramModal program={activeProgram} applicationStatus={applicationStatus} seatText={seatText} averageRating={averageRating} currentRating={currentRating} rateProgram={rateProgram} hasApplied={hasApplied} requestApply={() => hasApplied(activeProgram.id) ? null : setApplyProgramId(activeProgram.id)} isApproved={isApprovedFor(activeProgram.id)} openMeeting={() => openMeeting(activeProgram.id)} close={() => setActiveProgramId(null)} teacherOpen={() => setTeacherOpen(true)} />}
      {teacherOpen && <TeacherModal close={() => setTeacherOpen(false)} />}
      {applyProgram && <ApplyModal program={applyProgram} apply={() => applyToProgram(applyProgram.id)} close={() => setApplyProgramId(null)} />}
      {meetingProgram && <MeetingModal program={meetingProgram} info={infoFor(meetingProgram.id)} setInfo={(next) => setMeetingDrafts((drafts) => ({ ...drafts, [meetingProgram.id]: { ...infoFor(meetingProgram.id), ...next } }))} isTeacher={isTeacher} save={() => saveMeetingInfo(meetingProgram.id)} close={() => setMeetingProgramId(null)} />}
      {rosterProgram && <RosterModal program={rosterProgram} applications={applicationsFor(rosterProgram.id)} expandedStudentId={expandedStudentId} noteDrafts={noteDrafts} setNoteDrafts={setNoteDrafts} toggleNotes={toggleNotes} updateApplication={updateApplication} saveStudentNotes={saveStudentNotes} close={() => setRosterProgramId(null)} />}
    </div>
  );
}

function ProgramModal({ program, applicationStatus, seatText, averageRating, currentRating, rateProgram, hasApplied, requestApply, isApproved, openMeeting, close, teacherOpen }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="modal"><button className="close-button" type="button" onClick={close}>x</button><span className="status-badge">{applicationStatus(program.id)}</span><div className="modal-head"><img className="modal-image" src={program.image} alt="" /><div><h2>{program.title}</h2><p>{program.description}</p></div></div><div className="detail-grid"><article className="detail-card"><span>Schedule</span><strong>{program.schedule}</strong></article><article className="detail-card"><span>Sessions</span><strong>{program.sessions}</strong></article><article className="detail-card"><span>Daily time</span><strong>{program.time}</strong></article><article className="detail-card"><span>Seats</span><strong>{seatText(program)}</strong></article></div><section className="teacher-box"><div><p className="eyebrow">Teacher</p><button className="teacher-link" type="button" onClick={teacherOpen}>John Smith</button></div><p>Click the teacher name to view credentials and accomplishments.</p></section><div className="tags">{program.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="rating-box"><p className="eyebrow">Finished the program?</p><div className="rating-row">{[1, 2, 3, 4, 5].map((value) => <button className={currentRating === value ? "active" : ""} key={value} type="button" onClick={() => rateProgram(value)}>{value}</button>)}</div><p className="hint">{currentRating ? `You rated this program ${currentRating} out of 5.` : "Students can rate after completing the program."}</p></div><div className="modal-actions"><button className="primary-button" type="button" onClick={requestApply}>{hasApplied(program.id) ? "Application sent" : "Apply now ->"}</button>{isApproved && <button className="outline-button" type="button" onClick={openMeeting}>Meeting information</button>}<button className="outline-button" type="button" onClick={close}>Close</button></div></div></div>;
}

function TeacherModal({ close }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="small-modal"><button className="close-button" type="button" onClick={close}>x</button><h2>John Smith</h2><dl className="profile-list"><div><dt>University</dt><dd>University of Michigan</dd></div><div><dt>Age</dt><dd>29</dd></div><div><dt>Education</dt><dd>Master's degree in Education</dd></div><div><dt>Credentials</dt><dd>Certified writing tutor and youth career coach</dd></div><div><dt>Accomplishments</dt><dd>Helped 150+ students draft resumes, college essays, and scholarship applications.</dd></div></dl></div></div>;
}

function ApplyModal({ program, apply, close }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="small-modal"><button className="close-button" type="button" onClick={close}>x</button><p className="eyebrow">Confirm application</p><h2>Apply to {program.title}?</h2><p className="muted">This will send your name and email to the teacher roster for this program.</p><div className="modal-actions"><button className="primary-button" type="button" onClick={apply}>Yes, apply</button><button className="outline-button" type="button" onClick={close}>Cancel</button></div></div></div>;
}

function MeetingModal({ program, info, setInfo, isTeacher, save, close }) {
  const meetUrl = info.meet_url || "https://meet.google.com/";
  return <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="modal meeting-modal"><button className="close-button" type="button" onClick={close}>x</button><p className="eyebrow">Meeting information</p><h2>{program.title}</h2><section className="meeting-hero"><div><span className="status-badge">{isTeacher ? "Teacher controls" : "Approved student access"}</span><p className="muted">Live sessions run on Google Meet. Review the lesson plan, materials, and homework before each meeting.</p></div><div className="meet-card"><a className="primary-button" href={meetUrl} target="_blank" rel="noreferrer">Open Google Meet</a>{!info.meet_url && <p className="empty-state">Teacher has not added a custom meeting link yet.</p>}<p><strong>Meeting code</strong><span>{info.meet_code || "Not added yet"}</span></p></div></section>{isTeacher && <section className="meeting-editor"><label>Google Meet link<input type="url" value={info.meet_url} onChange={(event) => setInfo({ meet_url: event.target.value })} placeholder="https://meet.google.com/abc-defg-hij" /></label><label>Meeting code<input type="text" value={info.meet_code} onChange={(event) => setInfo({ meet_code: event.target.value })} placeholder="abc-defg-hij" /></label><label className="homework-editor">Homework instructions<textarea value={info.homework} onChange={(event) => setInfo({ homework: event.target.value })} placeholder="Add homework instructions for approved students..." /></label><button className="primary-button" type="button" onClick={save}>Save meeting info</button></section>}<section className="lesson-section"><div className="section-heading"><p className="eyebrow">Lesson plan</p><h3>Dates, goals, and materials</h3></div><div className="lesson-list">{(lessonPlans[program.id] || []).map(([date, complete, materials], index) => <article className="lesson-card" key={date}><div className="lesson-number">{index + 1}</div><div><h4>{date}</h4><p className="lesson-time">4:00 PM - 7:00 PM ET</p><dl><div><dt>What students complete</dt><dd>{complete}</dd></div><div><dt>Materials needed</dt><dd>{materials}</dd></div></dl></div></article>)}</div></section><section className="homework-box"><div className="section-heading"><p className="eyebrow">Homework</p><h3>Teacher instructions</h3></div><p className={!info.homework ? "empty-state" : ""}>{info.homework || "No homework has been added yet."}</p></section></div></div>;
}

function RosterModal({ program, applications, expandedStudentId, noteDrafts, setNoteDrafts, toggleNotes, updateApplication, saveStudentNotes, close }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="modal"><button className="close-button" type="button" onClick={close}>x</button><h2>{program.title} roster</h2><div className="roster-list">{applications.length ? applications.map((student) => <div className="roster-item" key={`${student.program_id}-${student.student_email}`}><div className="roster-main" role="button" tabIndex={0} onClick={() => toggleNotes(student)} onKeyDown={(event) => event.key === "Enter" && toggleNotes(student)}><div><strong>{student.student_name || student.student_email}</strong><span>{student.student_email}</span></div><span>{statusText[normalizedStatus(student)]}</span></div>{normalizedStatus(student) !== "approved" && <button className="primary-button" type="button" onClick={() => updateApplication(student, "approved")}>Approve</button>}{expandedStudentId === student.id && <div className="student-notes-panel"><div className="status-controls">{statuses.map((status) => <button className={normalizedStatus(student) === status ? "active" : ""} key={status} type="button" onClick={() => updateApplication(student, status)}>{statusText[status]}</button>)}</div><label>Teacher notes<textarea value={noteDrafts[student.id] ?? student.teacher_notes ?? ""} onChange={(event) => setNoteDrafts((drafts) => ({ ...drafts, [student.id]: event.target.value }))} placeholder="Add private notes about this student..." /></label><button className="outline-button" type="button" onClick={() => saveStudentNotes(student)}>Save notes</button></div>}</div>) : <div className="roster-item"><strong>No students yet</strong><span>Waiting</span></div>}</div></div></div>;
}
