function HubStudents() {
  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Students</p>
            <h2>Student management is coming next</h2>
            <p>
              This placeholder reserves the hub-level student area so enrollments, communication,
              and progress tools can live inside the same teacher platform.
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-empty">
        <h2>No student tools yet</h2>
        <p>
          This hub already owns the content side of the system. Student operations can now be
          layered onto the same architecture without changing routes again.
        </p>
      </section>
    </div>
  )
}

export default HubStudents
