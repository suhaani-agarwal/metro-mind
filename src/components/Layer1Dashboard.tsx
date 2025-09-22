import React, { useState } from 'react';
import { generateData, optimize, getResults } from './api';
import { OptimizationResponse, ReadinessScore, CleaningAssignment } from './types';
import ParkingMapComponent from './ParkingMap';

// Simplified styles to improve performance
const styles = {
  container: {
    padding: '2rem',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    color: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '2rem',
    marginBottom: '2rem',
    padding: '1.5rem 2rem',
    background: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    backdropFilter: 'blur(10px)'
  },

  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },

  btn: {
    background: 'linear-gradient(135deg, #06d6a0, #0891b2)',
    color: '#ffffff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontWeight: '700',
    marginRight: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },

  btnOutline: {
    background: 'rgba(30, 41, 59, 0.6)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },

  error: {
    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
    padding: '1rem 1.5rem',
    borderRadius: '12px',
    color: '#ffffff',
    marginBottom: '1.5rem'
  },

  main: {
    display: 'grid',
    gridTemplateColumns: '400px 1fr',
    gap: '2rem',
    alignItems: 'start'
  },

  left: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
    height: 'fit-content'
  },

  right: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem'
  },

  card: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    padding: '1.5rem',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)'
  },

  cardTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#f8fafc'
  },

  scrollContainer: {
    maxHeight: '500px', // Match map + details height
    overflowY: 'auto' as const,
    paddingRight: '0.5rem'
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem'
  },

  scoreCard: {
    padding: '1rem',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(6, 214, 160, 0.15), rgba(16, 185, 129, 0.05))',
    border: '1px solid rgba(6, 214, 160, 0.2)',
    transition: 'all 0.3s ease'
  },

  trainId: {
    fontWeight: '800',
    fontSize: '1.1rem',
    color: '#6ee7b7',
    fontFamily: 'Monaco, monospace',
    marginBottom: '0.5rem'
  },

  score: {
    fontSize: '2rem',
    fontWeight: '900',
    color: '#06d6a0',
    fontFamily: 'Monaco, monospace',
    marginBottom: '0.5rem'
  },

  details: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    lineHeight: '1.4'
  },

  rowList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },

  smallCard: {
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    padding: '1rem',
    borderRadius: '12px'
  },

  smallCardTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#cbd5e1'
  },

  listScroll: {
    maxHeight: '120px',
    overflowY: 'auto' as const,
    paddingRight: '0.5rem'
  },

  badgeGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.5rem'
  },

  listBadgeSmall: {
    border: 'none',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
    minWidth: '60px',
    textAlign: 'center' as const,
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, rgba(6, 214, 160, 0.2), rgba(16, 185, 129, 0.1))',
    color: '#6ee7b7',
    // border: '1px solid rgba(6, 214, 160, 0.3)'
  },

  listBadgeSmallIbl: {
    border: 'none',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
    minWidth: '60px',
    textAlign: 'center' as const,
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(59, 130, 246, 0.1))',
    color: '#7dd3fc',
    // border: '1px solid rgba(56, 189, 248, 0.3)'
  },

  fullWidthCard: {
    gridColumn: '1 / -1',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    padding: '2rem',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
    marginTop: '2rem'
  },

  cleaningList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem'
  },

  cleaningItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    transition: 'all 0.3s ease'
  },

  itemLeft: {
    flex: 1
  },

  itemRight: {
    textAlign: 'right' as const,
    color: '#cbd5e1'
  },

  small: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginTop: '0.25rem'
  },

  empty: {
    color: '#64748b',
    textAlign: 'center' as const,
    padding: '2rem',
    fontStyle: 'italic'
  },

  detailsCard: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    padding: '1.5rem',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
    height: 'fit-content'
  },

  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 0',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
    marginBottom: '1rem'
  },

  scoreBadge: {
    background: 'linear-gradient(135deg, rgba(6, 214, 160, 0.2), rgba(16, 185, 129, 0.1))',
    color: '#06d6a0',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontWeight: '800',
    fontSize: '0.9rem',
    marginLeft: '1rem'
  },

  detailHeader: {
    color: '#38bdf8',
    fontSize: '1rem',
    fontWeight: '700',
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid rgba(56, 189, 248, 0.2)'
  },

  detailsList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gap: '0.75rem'
  },

  detailItem: {
    background: 'rgba(30, 41, 59, 0.6)',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    color: '#e2e8f0',
    borderLeft: '3px solid rgba(56, 189, 248, 0.4)'
  },

  reasonItem: {
    background: 'rgba(15, 23, 42, 0.6)',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    color: '#94a3b8',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    borderLeft: '3px solid rgba(168, 85, 247, 0.4)'
  },

  muted: {
    color: '#64748b',
    fontSize: '0.9rem'
  }
};

function ReadinessList({ scores }: { scores: ReadinessScore[] }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Readiness Scores</h3>
      <div style={styles.scrollContainer}>
        <div style={styles.grid}>
          {scores.map(s => (
            <div key={s.train_id} style={styles.scoreCard}>
              <div style={styles.trainId}>{s.train_id}</div>
              <div style={styles.score}>{s.score.toFixed(1)}</div>
              <div style={styles.details}>{(() => {
                const det = s.details || {} as Record<string, unknown>;
                if (det && typeof det === 'object') {
                  const summary = det['summary'];
                  if (typeof summary === 'string') return summary;
                  const keys = Object.keys(det).filter(k => k !== 'combined');
                  if (keys.length > 0) {
                    const v = det[keys[0]];
                    if (typeof v === 'string') return v.length > 80 ? v.slice(0, 80) + '…' : v;
                  }
                  return '';
                }
                return '';
              })()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CleaningSchedule({ assignments }: { assignments: CleaningAssignment[] }) {
  return (
    <div style={styles.fullWidthCard}>
      <h3 style={styles.cardTitle}>Cleaning Schedule</h3>
      {assignments.length === 0 ? (
        <div style={styles.empty}>No cleaning required</div>
      ) : (
        <ul style={styles.cleaningList}>
          {assignments.map(a => (
            <li key={a.train_id} style={styles.cleaningItem}>
              <div style={styles.itemLeft}>
                <strong>{a.train_id}</strong>
                <div style={styles.muted}>{a.reason}</div>
              </div>
              <div style={styles.itemRight}>
                <div>{a.start_time} → {a.end_time}</div>
                <div style={styles.small}>Crew {a.crew_assigned} • Priority {a.priority}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Layer1Dashboard() {
  const [data, setData] = useState<OptimizationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      await generateData();
      const res = await optimize();
      setData(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleFetch() {
    setError(null);
    setLoading(true);
    try {
      const res = await getResults();
      setData(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Tonight's Parking + Cleaning Schedule</h1>
        <div>
          <button
            style={{ ...styles.btn, ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
            onClick={handleGenerate}
            disabled={loading}
          >
            Get today's schedule
          </button>
          <button
            style={{ ...styles.btnOutline, ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
            onClick={handleFetch}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <main style={styles.main}>
        <div style={styles.left}>
          {/* Service and IBL lists */}
          <div style={styles.rowList}>
            <div style={styles.smallCard}>
              <h4 style={styles.smallCardTitle}>Service (selected)</h4>
              <div style={styles.listScroll}>
                <div style={styles.badgeGrid}>
                  {(data?.trains_to_service || []).map(t => {
                    const score = data?.readiness_scores?.find(s => s.train_id === t)?.score;
                    return (
                      <button
                        key={t}
                        title={score ? `Readiness Score: ${score.toFixed(1)}` : t}
                        style={styles.listBadgeSmall}
                        onClick={() => setSelectedTrain(t)}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={styles.smallCard}>
              <h4 style={styles.smallCardTitle}>IBL (maintenance)</h4>
              <div style={styles.listScroll}>
                <div style={styles.badgeGrid}>
                  {(data?.trains_to_ibl || []).map(t => {
                    const score = data?.readiness_scores?.find(s => s.train_id === t)?.score;
                    return (
                      <button
                        key={t}
                        title={score ? `Score: ${score.toFixed(1)}` : t}
                        style={styles.listBadgeSmallIbl}
                        onClick={() => setSelectedTrain(t)}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <ReadinessList scores={data?.readiness_scores || []} />
        </div>

        <div style={styles.right}>
          <ParkingMapComponent
            assignments={data?.parking_assignments || []}
            depotLayout={data?.explanation}
            selected={selectedTrain}
            onSelect={setSelectedTrain}
          />

          <div style={styles.detailsCard}>
            <h3 style={styles.cardTitle}>Details</h3>
            {selectedTrain ? (
              (() => {
                const trainScore = data?.readiness_scores?.find(r => r.train_id === selectedTrain);
                const park = data?.parking_assignments?.find(p => p.train_id === selectedTrain);
                const explanation = data?.explanation || {};
                const expl = explanation as Record<string, unknown> | undefined;
                const svcReasons = expl && (expl['service_train_reasons'] as Record<string, unknown> | undefined);
                const iblReasons = expl && (expl['trains_to_ibl_reasons'] as Record<string, unknown> | undefined);
                const reasons = (svcReasons && (svcReasons[selectedTrain] as unknown)) || (iblReasons && (iblReasons[selectedTrain] as unknown)) || {};

                const details = (trainScore?.details ?? {}) as Record<string, string>;
                const messages: string[] = [];
                if (typeof details.summary === 'string') messages.push(details.summary);

                Object.keys(details).forEach(k => {
                  if (k === 'combined' || k === 'summary') return;
                  const v = details[k];
                  if (typeof v === 'string' && v.trim()) messages.push(v);
                });

                const shown = messages.slice(0, 6);

                return (
                  <div>
                    <div style={styles.summaryRow}>
                      <strong>{selectedTrain}</strong>
                      <span style={styles.scoreBadge}>
                        Priority Score: <strong>{trainScore?.score ?? 'N/A'}</strong>
                      </span>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <div style={styles.detailHeader}>Key Points</div>
                      <ul style={styles.detailsList}>
                        {shown.map((m, i) => (
                          <li key={i} style={styles.detailItem}>{m}</li>
                        ))}
                        {messages.length > shown.length && (
                          <li style={styles.detailItem}>+{messages.length - shown.length} more…</li>
                        )}
                      </ul>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <div style={styles.detailHeader}>Reasons</div>
                      <div>
                        {reasons && typeof reasons === 'object' ? (
                          Object.entries(reasons as Record<string, string>).slice(0, 4).map(([k, v]) => (
                            <div key={k} style={styles.reasonItem}>
                              {typeof v === 'string' ? v : JSON.stringify(v)}
                            </div>
                          ))
                        ) : (
                          <div style={styles.muted}>No specific reasons provided</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div style={styles.empty}>Select a train to view explanation and shunting steps</div>
            )}
          </div>
        </div>
      </main>

      <CleaningSchedule assignments={data?.cleaning_assignments || []} />
    </div>
  );
}