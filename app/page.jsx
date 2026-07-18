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
    description: "This 3-day boot camp helps students identify their strengths, organize school activities and work experience, write strong bullet points, and finish with a clean resume draft. Students meet for 3 hours each day and leave with a document they can keep improving.",
    schedule: "3 days",
    sessions: "3 live sessions",
    time: "3 hours per day",
    seats: 8,
    tags: ["Resumes", "Career Skills", "Portfolio"]
  },
  {
    id: "essays",
    title: "College Essay Studio",
    status: "Apply now",
    short: "Plan, draft, revise, and polish main college essays with optional supplementals.",
    description: "This 2-week writing program guides students through brainstorming, outlining, drafting, revising, and polishing their main college essay. Students meet 3 hours per day. If a student finishes early, the remaining time can be used for supplemental essays.",
    schedule: "2 weeks",
    sessions: "10 live sessions",
    time: "3 hours per day",
    seats: 10,
    tags: ["College Essays", "Writing", "Admissions"]
  }
];

export default function Page() {
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [applications, setApplications] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [activeProgramId, setActiveProgramId] = useState(null);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [rosterProgramId, setRosterProgramId] = useState(null);

  const activeProgram = useMemo(() => programs.find((program) => program.id === activeProgramId), [activeProgramId]);
  const rosterProgram = useMemo(() => programs.find((program) => program.id === rosterProgramId), [rosterProgramId]);
  const isTeacher = user && user.email?.toLowerCase() === teacherEmail.toLowerCase();

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
    const applicationQuery = supabase.from("program_applications").select("program_id, student_email, created_at").order("created_at", { ascending: true });
    const ratingQuery = supabase.from("program_ratings").select("program_id, student_email, rating, updated_at").order("updated_at", { ascending: false });

    if (!teacher) {
      applicationQuery.eq("student_id", sessionUser.id);
      ratingQuery.eq("student_id", sessionUser.id);
    }

    const [{ data: appRows, error: appError }, { data: ratingRows, error: ratingError }] = await Promise.all([applicationQuery, ratingQuery]);

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
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (!signInError) {
        setUser(signInData.user);
        await loadData(signInData.user);
        return;
      }
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: cleanEmail, password });
      if (signUpError) {
        setMessage(signUpError.message);
        setIsError(true);
        return;
      }
      if (!signUpData.session) {
        setMessage("Account created. Check your email if Supabase asks you to confirm before signing in.");
        setIsError(false);
        return;
      }
      setUser(signUpData.user);
      await loadData(signUpData.user);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
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
    const { error } = await supabase.from("program_applications").upsert({ program_id: programId, student_id: user.id, student_email: user.email }, { onConflict: "program_id,student_id" });
    if (error) {
      setMessage(error.message);
      setIsError(true);
      return;
    }
    setActiveProgramId(programId);
    await loadData(user);
  }

  async function rateProgram(value) {
    if (!user || !activeProgramId || !supabase) return;
    const { error } = await supabase.from("program_ratings").upsert({ program_id: activeProgramId, student_id: user.id, student_email: user.email, rating: value, updated_at: new Date().toISOString() }, { onConflict: "program_id,student_id" });
    if (error) {
      setMessage(error.message);
      setIsError(true);
      return;
    }
    await loadData(user);
  }

  const currentRating = ratings.find((item) => item.program_id === activeProgramId && item.student_email === user?.email)?.rating;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark" aria-hidden="true">{Array.from({ length: 9 }).map((_, index) => <span key={index}></span>)}</div><span>edcubed</span></div>
        <nav className="nav" aria-label="Main navigation"><a href="#"><span className="nav-icon">O</span>Overview</a><a href="#"><span className="nav-icon">B</span>Bookings</a><a href="#"><span className="nav-icon">C</span>Classroom</a><a className="active" href="#"><span className="nav-icon">P</span>Programs</a><a href="#"><span className="nav-icon">D</span>Docs</a></nav>
      </aside>

      <main className="main">
        <header className="topbar"><div className="top-actions"><button className="icon-button bell-button" type="button" aria-label="Notifications"><svg className="bell-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"></path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path></svg><span className="dot"></span></button><button className="avatar" type="button" aria-label="Account">JS</button></div></header>

        {!user && (
          <section className="auth-panel" aria-labelledby="authTitle">
            <div><p className="eyebrow">Programs access</p><h1 id="authTitle">Sign in to edcubed programs</h1><p className="muted">Students can apply and rate programs. Teachers can view rosters for each program.</p></div>
            <form className="auth-card" onSubmit={handleLogin}>
              <div className="role-toggle" role="tablist" aria-label="Account type"><button className={`role-tab ${role === "student" ? "active" : ""}`} type="button" onClick={() => setRole("student")}>Student</button><button className={`role-tab ${role === "teacher" ? "active" : ""}`} type="button" onClick={() => setRole("teacher")}>Teacher</button></div>
              <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={role === "teacher" ? teacherEmail : "student@example.com"} required /></label>
              <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" required /></label>
              <p className="hint">{role === "teacher" ? "Use the teacher account created in Supabase Auth." : "Students can create an account with any email and password."}</p>
              {message && <p className={`status-message ${isError ? "error" : ""}`}>{message}</p>}
              <button className="primary-button" type="submit">Continue -&gt;</button>
            </form>
          </section>
        )}

        {user && !isTeacher && (
          <section className="dashboard" aria-labelledby="studentTitle">
            <div className="hero-program"><div className="hero-copy"><div className="pills"><span>Featured program</span><span className="green">Apply now</span></div><h1 id="studentTitle">Resume Builder Boot Camp</h1><p>Students learn how to write a clear resume, organize school and extracurricular experience, and leave with a polished first draft ready to improve over time.</p><div className="tags">{programs[0].tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="button-row"><button className="primary-button" type="button" onClick={() => applyToProgram("resume")}>Apply now -&gt;</button><button className="outline-button" type="button" onClick={() => setActiveProgramId("resume")}>View program -&gt;</button></div></div><div className="hero-stats"><article><strong>3 days</strong><span>3 hours per day</span></article><article><strong>9 live hours</strong><span>resume building and feedback</span></article><article><strong>{seatText(programs[0])}</strong><span>open for applications</span></article></div></div>
            <div className="section-title"><h2>Explore Programs</h2><button className="ghost-button" type="button" onClick={logout}>Sign out</button></div>
            {message && <p className={`status-message ${isError ? "error" : ""}`}>{message}</p>}
            <div className="filters" aria-label="Program categories"><button className="active" type="button">All</button><button type="button">Writing</button><button type="button">College</button><button type="button">Career</button></div>
            <div className="program-grid">{programs.map((program) => <ProgramCard key={program.id} program={program} label={hasApplied(program.id) ? "Applied" : program.status} text={program.short} action={() => setActiveProgramId(program.id)} />)}</div>
          </section>
        )}

        {isTeacher && (
          <section className="dashboard teacher-dashboard" aria-labelledby="teacherTitle">
            <div className="teacher-head"><div><p className="eyebrow">Teacher portal</p><h1 id="teacherTitle">Program Rosters</h1><p className="muted">View student applications by program. Program descriptions are hidden on this side.</p></div><button className="ghost-button" type="button" onClick={logout}>Sign out</button></div>
            {message && <p className={`status-message ${isError ? "error" : ""}`}>{message}</p>}
            <div className="program-grid">{programs.map((program) => { const roster = applicationsFor(program.id); return <ProgramCard key={program.id} program={program} label={`${roster.length} applied`} text={roster.length ? `Ratings: ${averageRating(program.id)}` : "No applications yet."} action={() => setRosterProgramId(program.id)} actionText="View roster -&gt;" />; })}</div>
          </section>
        )}
      </main>

      <aside className="right-panel" aria-label="Program sidebar"><section className="side-card"><div className="side-card-title"><span className="side-icon">!</span><h2>Upcoming Program</h2></div><div className="notice"><strong>Resume Builder Boot Camp</strong><span>Applications are open for the next guided group.</span></div><button className="primary-button full" type="button" onClick={() => applyToProgram("resume")}>Register interest</button></section><section className="help-card"><h2>Not sure what to choose?</h2><p>Pick the support that matches the student's next goal.</p><button type="button">I need a resume -&gt;</button><button type="button">I need essay help -&gt;</button><button type="button">I want college guidance -&gt;</button></section></aside>

      {activeProgram && <ProgramModal program={activeProgram} applied={hasApplied(activeProgram.id)} seats={seatText(activeProgram)} rating={currentRating} onApply={() => applyToProgram(activeProgram.id)} onRate={rateProgram} onClose={() => setActiveProgramId(null)} onTeacher={() => setTeacherOpen(true)} />}
      {teacherOpen && <TeacherModal onClose={() => setTeacherOpen(false)} />}
      {rosterProgram && <RosterModal program={rosterProgram} roster={applicationsFor(rosterProgram.id)} onClose={() => setRosterProgramId(null)} />}
    </div>
  );
}

function ProgramCard({ program, label, text, action, actionText = "View program ->" }) {
  return <article className="program-card"><div className="image-placeholder" aria-label="Program image placeholder"></div><div className="program-card-head"><h3>{program.title}</h3><span className="status-badge">{label}</span></div><p>{text}</p><div className="tags">{program.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><button className="outline-button" type="button" onClick={action}>{actionText}</button></article>;
}

function ProgramModal({ program, applied, seats, rating, onApply, onRate, onClose, onTeacher }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modalTitle" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal"><button className="close-button" type="button" aria-label="Close" onClick={onClose}>x</button><span className="status-badge">{applied ? "Applied" : program.status}</span><div className="modal-head"><span className="modal-icon">P</span><div><h2 id="modalTitle">{program.title}</h2><p>{program.description}</p></div></div><div className="detail-grid"><article className="detail-card"><span>Schedule</span><strong>{program.schedule}</strong></article><article className="detail-card"><span>Sessions</span><strong>{program.sessions}</strong></article><article className="detail-card"><span>Daily time</span><strong>{program.time}</strong></article><article className="detail-card"><span>Seats</span><strong>{seats}</strong></article></div><section className="teacher-box"><div><p className="eyebrow">Teacher</p><button className="teacher-link" type="button" onClick={onTeacher}>John Smith</button></div><p>Click the teacher name to view credentials and accomplishments.</p></section><div className="tags">{program.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="rating-box"><p className="eyebrow">Finished the program?</p><div className="rating-row" aria-label="Rate this program">{[1, 2, 3, 4, 5].map((value) => <button className={rating === value ? "active" : ""} key={value} type="button" onClick={() => onRate(value)}>{value}</button>)}</div><p className="hint">{rating ? `You rated this program ${rating} out of 5.` : "Students can rate after completing the program."}</p></div><div className="modal-actions"><button className="primary-button" type="button" onClick={onApply}>{applied ? "Application sent" : "Apply now ->"}</button><button className="outline-button" type="button" onClick={onClose}>Close</button></div></div></div>;
}

function TeacherModal({ onClose }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="teacherModalTitle" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="small-modal"><button className="close-button" type="button" aria-label="Close" onClick={onClose}>x</button><h2 id="teacherModalTitle">John Smith</h2><dl className="profile-list"><div><dt>University</dt><dd>University of Michigan</dd></div><div><dt>Age</dt><dd>29</dd></div><div><dt>Education</dt><dd>Master's degree in Education</dd></div><div><dt>Credentials</dt><dd>Certified writing tutor and youth career coach</dd></div><div><dt>Accomplishments</dt><dd>Helped 150+ students draft resumes, college essays, and scholarship applications.</dd></div></dl></div></div>;
}

function RosterModal({ program, roster, onClose }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rosterTitle" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal"><button className="close-button" type="button" aria-label="Close" onClick={onClose}>x</button><h2 id="rosterTitle">{program.title} roster</h2><div className="roster-list">{roster.length ? roster.map((student) => <div className="roster-item" key={`${student.program_id}-${student.student_email}`}><strong>{student.student_email}</strong><span>Applied</span></div>) : <div className="roster-item"><strong>No students yet</strong><span>Waiting</span></div>}</div></div></div>;
}
