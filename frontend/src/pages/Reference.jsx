import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { HiInformationCircle, HiCollection, HiAcademicCap, HiCog } from 'react-icons/hi';

const STATUS_FLOW = [
  { key: 'draft', desc: 'Being prepared by the province focal — not yet visible to the regional focal.' },
  { key: 'submitted', desc: "Sent in for review and placed in the regional focal's queue." },
  { key: 'under_review', desc: 'The regional focal is actively checking it.' },
  { key: 'for_revision', desc: 'Sent back with required remarks on what to fix. The province focal is notified and can edit and resubmit it.' },
  { key: 'approved', desc: 'Passed review — the paperwork is in order.' },
  { key: 'ongoing', desc: 'The actual training is currently being conducted.' },
  { key: 'completed', desc: 'The training activity has finished.' },
  { key: 'consolidated', desc: 'Folded into the regional consolidated report — the final stage of the pipeline.' },
];

const FEATURES = [
  { label: 'Dashboard', scope: 'Everyone', desc: 'At-a-glance counts and charts of training activities by status, quarter, and province.' },
  { label: 'Training Activities / My Trainings', scope: 'Everyone', desc: "Create, edit, and track training activity records. Province focals see only their own province's records; regional focals see all of them." },
  { label: 'Review Submissions', scope: 'Regional SPARK Focal', desc: 'Queue of submissions awaiting review. Move records through the pipeline — approve, return for revision, or advance them — individually or in bulk.' },
  { label: 'Reports & Exports', scope: 'Everyone', desc: 'Generate PDF/Excel exports of training data, filtered by quarter, province, or status, for offline use or sharing.' },
  { label: 'User Management', scope: 'Regional SPARK Focal', desc: 'Create and manage province focal accounts, reset passwords, and assign each account to a province.' },
  { label: 'Province Management', scope: 'Regional SPARK Focal', desc: 'Maintain the master list of provinces that user accounts and training activities are assigned to.' },
  { label: 'Target Sector Management', scope: 'Regional SPARK Focal', desc: 'Maintain the lookup list of target sectors offered as a dropdown on the training activity form.' },
  { label: 'My Profile', scope: 'Everyone', desc: 'Update your name and email, and change your password.' },
];

function TutorialStep({ n, title, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-gray-600 mt-0.5">{children}</p>
      </div>
    </div>
  );
}

export default function Reference() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'spark_focal';
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { key: 'overview', icon: HiInformationCircle, label: 'Overview' },
    { key: 'workflow', icon: HiCollection, label: 'Features & Workflow' },
    { key: 'tutorials', icon: HiAcademicCap, label: 'Tutorials' },
    { key: 'system', icon: HiCog, label: 'System Notes' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="page-title">Reference & Tutorials</h1>
        <p className="page-subtitle">
          Everything about SPARK TMS in one place — how it works, what each role can do, and how
          to get things done. Open it any time from{' '}
          <span className="font-medium">Reference</span> in the sidebar.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">What is SPARK TMS?</h3>
            </div>
            <div className="card-body space-y-2 text-sm text-gray-700">
              <p>
                SPARK TMS (Training Monitoring System) is the shared platform SPARK uses to record,
                review, and consolidate training activities reported by each province. Instead of
                emailing spreadsheets back and forth, every training activity is entered once, goes
                through a review workflow, and ends up in a single regional report.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">The two roles</h3>
            </div>
            <div className="card-body space-y-4 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <span className="badge bg-primary-100 text-primary-700 mt-0.5 flex-shrink-0">Regional SPARK Focal</span>
                <p>
                  The regional admin. Can see every province's submissions, review and approve or
                  return them, manage user accounts, the list of provinces and target sectors, and
                  generate region-wide reports.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge bg-teal-100 text-teal-700 mt-0.5 flex-shrink-0">Province Focal</span>
                <p>
                  Assigned to a single province. Creates and submits that province's training
                  activities, tracks their review status, and generates reports scoped to their
                  own province.
                </p>
              </div>
              <p className="text-xs text-gray-400 pt-1">
                You're currently signed in as {isAdmin ? 'a Regional SPARK Focal' : 'a Province Focal'}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Features & Workflow */}
      {activeTab === 'workflow' && (
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">What each page does</h3>
            </div>
            <div className="card-body space-y-3">
              {FEATURES.map(f => (
                <div key={f.label} className="flex items-start gap-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{f.label}</p>
                    <p className="text-gray-600">{f.desc}</p>
                  </div>
                  <span className={`badge flex-shrink-0 ${f.scope === 'Everyone' ? 'bg-gray-100 text-gray-600' : 'bg-primary-100 text-primary-700'}`}>
                    {f.scope}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">The training activity pipeline</h3>
              <p className="text-xs text-gray-500 mt-1">
                Every record moves through these stages, in order, via its{' '}
                <code className="px-1 py-0.5 bg-gray-100 rounded">status</code> field.
              </p>
            </div>
            <div className="card-body space-y-2">
              {STATUS_FLOW.map((s, i) => (
                <div key={s.key} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                  <StatusBadge status={s.key} />
                  <p className="text-gray-600">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Other things worth knowing</h3>
            </div>
            <div className="card-body space-y-2 text-sm text-gray-700">
              <p>
                <strong>Training Status</strong> (Ongoing / Done) is a separate field from the
                pipeline status above — it tracks whether the actual training event has happened
                yet, independent of where the paperwork is in review. A training can be marked
                "Done" in real life while its record is still "Under Review".
              </p>
              <p>
                <strong>Dates and mode</strong> can be left as "TBD" if a training hasn't been
                scheduled yet — fill them in once they're confirmed.
              </p>
              <p>
                <strong>Enrollment numbers</strong> (total enrolled, graduates, completion rate)
                are calculated automatically from the male/female counts you enter — no need to
                total them yourself.
              </p>
              <p>
                <strong>Supporting documents</strong> — each record tracks a checklist of required
                links (agreements, scoresheets, reports, etc.) and flags which ones are still
                missing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tutorials */}
      {activeTab === 'tutorials' && (
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Getting started</h3>
            </div>
            <div className="card-body space-y-3">
              <TutorialStep n={1} title="Your first login">
                New accounts start with a temporary password. On first login you'll be required to
                set your own before you can access anything else — change it again anytime from{' '}
                <strong>My Profile → Change Password</strong>.
              </TutorialStep>
              <TutorialStep n={2} title="Keep your details current">
                Update your name and email anytime from <strong>My Profile → Personal Info</strong>.
                Your username can't be changed.
              </TutorialStep>
            </div>
          </div>

          {!isAdmin && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900">Submitting a training activity</h3>
              </div>
              <div className="card-body space-y-3">
                <TutorialStep n={1} title="Start a new record">
                  Go to <strong>My Trainings → New</strong> and fill in the details — quarter,
                  dates ("TBD" if not yet scheduled), mode, target sector, enrollment counts, and
                  supporting-document links.
                </TutorialStep>
                <TutorialStep n={2} title="Save it as a draft">
                  Click <strong>Save Draft</strong> to keep working on it later — it stays fully
                  editable while it's a Draft (or while it's "For Revision").
                </TutorialStep>
                <TutorialStep n={3} title="Submit it for review">
                  When it's complete, open the record and click <strong>Submit</strong>. This moves
                  it from Draft to Submitted and places it in the regional focal's review queue —
                  it's no longer directly editable at this stage.
                </TutorialStep>
                <TutorialStep n={4} title="If it's returned for revision">
                  The regional focal will leave remarks describing what needs fixing, and you'll
                  be notified. The record becomes editable again — make the changes and submit it
                  the same way.
                </TutorialStep>
                <TutorialStep n={5} title="Track its progress">
                  The status badge on <strong>My Trainings</strong> always shows exactly where a
                  record is — Submitted → Under Review → Approved → Ongoing → Completed →
                  Consolidated.
                </TutorialStep>
              </div>
            </div>
          )}

          {isAdmin && (
            <>
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-gray-900">Reviewing submissions</h3>
                </div>
                <div className="card-body space-y-3">
                  <TutorialStep n={1} title="Open the review queue">
                    <strong>Review Submissions</strong> shows everything waiting on you, filterable
                    by status (Submitted / Under Review / For Revision / Approved).
                  </TutorialStep>
                  <TutorialStep n={2} title="Move a record forward">
                    Mark it <strong>Under Review</strong> while you're checking it, then either{' '}
                    <strong>Approve</strong> it or send it back <strong>For Revision</strong> with
                    remarks explaining what to fix — remarks are required for revisions, and the
                    province focal is notified automatically.
                  </TutorialStep>
                  <TutorialStep n={3} title="Carry it through to consolidation">
                    As the real-world training happens, advance it through{' '}
                    <strong>Ongoing → Completed → Consolidated</strong> (the final stage, when it's
                    folded into the regional report). Remarks are optional at these later stages.
                  </TutorialStep>
                  <TutorialStep n={4} title="Use bulk actions when you can">
                    Select several records with the checkboxes and apply the same action to all of
                    them at once from the bulk-action bar — handy at the end of a quarter when many
                    records move together.
                  </TutorialStep>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-gray-900">Administration</h3>
                </div>
                <div className="card-body space-y-3">
                  <TutorialStep n={1} title="Add a new province focal">
                    Go to <strong>User Management → New</strong>, fill in their details, and assign
                    them to a province. They'll receive a temporary password and be required to
                    change it on first login, just like you were.
                  </TutorialStep>
                  <TutorialStep n={2} title="Maintain reference lists">
                    Use <strong>Province Management</strong> and{' '}
                    <strong>Target Sector Management</strong> to keep the dropdown lists that
                    appear elsewhere in the app (province assignments, the training activity form)
                    accurate and up to date.
                  </TutorialStep>
                </div>
              </div>
            </>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Generating reports</h3>
            </div>
            <div className="card-body space-y-3">
              <TutorialStep n={1} title="Filter, then export">
                Open <strong>Reports & Exports</strong>, set your filters (quarter, province,
                status, etc.), and export to PDF or Excel — useful for offline reference or
                sharing outside the system.
              </TutorialStep>
            </div>
          </div>
        </div>
      )}

      {/* System Notes */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">How it's built</h3>
            </div>
            <div className="card-body space-y-2 text-sm text-gray-700">
              <p>
                SPARK TMS is a MERN-stack app: <strong>MongoDB</strong> (Atlas) for data,{' '}
                <strong>Express</strong> + <strong>Node.js</strong> for the API, and{' '}
                <strong>React</strong> (via Vite) for the interface, styled with Tailwind CSS.
              </p>
              <p>
                Authentication is JWT-based, with role-based access control (
                <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">spark_focal</code> /{' '}
                <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">province_focal</code>)
                enforced both in the interface (route guards) and on every API request.
              </p>
              <p>
                Notable building blocks: <strong>react-hook-form</strong> for forms and validation,{' '}
                <strong>react-hot-toast</strong> for notifications, and{' '}
                <strong>pdfkit</strong> / <strong>exceljs</strong> for generating the PDF and Excel
                exports on Reports & Exports.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Where it lives</h3>
            </div>
            <div className="card-body space-y-2 text-sm text-gray-700">
              <p>
                The frontend is hosted on <strong>Netlify</strong>, the backend on{' '}
                <strong>Railway</strong>, and the database on <strong>MongoDB Atlas</strong> — a
                single repository with the frontend and backend in their own subfolders, each
                platform pointed at the right one.
              </p>
              <p>
                The two sides are connected through environment variables: the frontend's{' '}
                <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">VITE_API_URL</code> points
                at the deployed backend, and the backend's{' '}
                <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">CLIENT_URL</code> tells it
                which frontend origin to allow (CORS).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
