import React, { useState, useEffect } from 'react';
import axios from 'axios';

const REVIEW_TYPES = [
  { value: 'review1', label: 'Review 1' },
  { value: 'review2', label: 'Review 2' },
  { value: 'review3', label: 'Review 3' },
];

const DURATION_OPTIONS = [15, 20, 30, 45, 60];

const CoordinatorReviewSchedule = () => {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    reviewType: 'review1',
    date: '',
    forenoonOrAfternoon: 'forenoon',
    startTime: '',
    endTime: '',
    duration: 30,
  });
  const [slots, setSlots] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: form, 2: assign
  const [allottedSchedules, setAllottedSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [scheduleStatus, setScheduleStatus] = useState({});

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getPreviousReview = (reviewType) => {
    if (reviewType === 'review2') return 'review1';
    if (reviewType === 'review3') return 'review2';
    return null;
  };

  const handleGenerateSlots = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    // Check if user is coordinator before making API call
    const isCoordinator = Array.isArray(user?.roles) && user.roles.some(r => r.role === 'coordinator');
    if (!isCoordinator) {
      setError('You are not a coordinator for any team.');
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        'http://localhost:5000/api/panels/coordinator/generate-slots',
        {
          slotType: form.reviewType,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          duration: Number(form.duration),
          forenoonOrAfternoon: form.forenoonOrAfternoon,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSlots(res.data.slots);
      setTeams(res.data.teams);
      setAssignments(res.data.teams.map((team) => ({ teamId: team._id, slot: null })));
      const prevReview = getPreviousReview(form.reviewType);
      if (prevReview) {
        const attRes = await axios.post('http://localhost:5000/api/panels/attendance/check', {
          teamIds: res.data.teams.map(t => t._id),
          reviewType: prevReview
        }, { headers: { Authorization: `Bearer ${token}` } });
        setAttendanceStatus(attRes.data);
        const schedRes = await axios.post('http://localhost:5000/api/panels/check-schedule-exists', {
          teamIds: res.data.teams.map(t => t._id),
          reviewType: form.reviewType
        }, { headers: { Authorization: `Bearer ${token}` } });
        setScheduleStatus(schedRes.data);
      } else {
        setAttendanceStatus({});
        setScheduleStatus({});
      }
      setStep(2);
    } catch (err) {
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        // Handle validation errors
        const errorMessages = err.response.data.errors.join('\n');
        setError(`Validation failed:\n${errorMessages}`);
      } else {
        setError(err.response?.data?.message || 'Failed to generate slots.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentChange = (teamId, slotIdx) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.teamId === teamId ? { ...a, slot: slots[slotIdx] } : a
      )
    );
  };

  const handleSubmitAssignments = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    
    // Check if user is coordinator before making API call
    const isCoordinator = Array.isArray(user?.roles) && user.roles.some(r => r.role === 'coordinator');
    if (!isCoordinator) {
      setError('You are not a coordinator for any team.');
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const usedSlots = new Set();
      for (const a of assignments) {
        if (!a.slot) throw new Error('All teams must be assigned a slot.');
        const slotKey = a.slot.start + '-' + a.slot.end;
        if (usedSlots.has(slotKey)) throw new Error('Each slot can only be assigned to one team.');
        usedSlots.add(slotKey);
      }
      await axios.post(
        'http://localhost:5000/api/panels/coordinator/assign-slots',
        {
          slotType: form.reviewType,
          assignments: assignments.map((a) => ({
            teamId: a.teamId,
            slot: a.slot,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Slots assigned successfully!');
      setStep(1);
      setSlots([]);
      setTeams([]);
      setAssignments([]);
    } catch (err) {
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        // Handle validation errors
        const errorMessages = err.response.data.errors.join('\n');
        setError(`Validation failed:\n${errorMessages}`);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to assign slots.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAllottedSchedules = async () => {
      setLoadingSchedules(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/panels/coordinator/allotted-schedules', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAllottedSchedules(res.data);
      } catch (err) {
        // silently ignore when unauthorized
      } finally {
        setLoadingSchedules(false);
      }
    };
    const hasCoordinatorRole = Array.isArray(user?.roles) && user.roles.some(r => r.role === 'coordinator');
    if (hasCoordinatorRole) {
      fetchAllottedSchedules();
    }
  }, [user]);

  // Check if user has coordinator role in roles array
  const isCoordinator = Array.isArray(user?.roles) && user.roles.some(r => r.role === 'coordinator');
  if (user && !isCoordinator) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
        <p className="text-red-600">You are not a coordinator for any team.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Review Schedule</h2>
      {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      {step === 1 && (
        <form onSubmit={handleGenerateSlots} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Review Type</label>
              <select name="reviewType" value={form.reviewType} onChange={handleChange} className="w-full border rounded px-2 py-1">
                {REVIEW_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Forenoon/Afternoon</label>
              <select name="forenoonOrAfternoon" value={form.forenoonOrAfternoon} onChange={handleChange} className="w-full border rounded px-2 py-1">
                <option value="forenoon">Forenoon</option>
                <option value="afternoon">Afternoon</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slot Duration (minutes)</label>
              <select name="duration" value={form.duration} onChange={handleChange} className="w-full border rounded px-2 py-1">
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Slots'}
          </button>
        </form>
      )}
      {step === 2 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Assign Slots to Teams</h3>
          <table className="w-full border mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Team</th>
                <th className="p-2 border">Assign Slot</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, idx) => {
                const prevReview = getPreviousReview(form.reviewType);
                const attendanceMarked = prevReview ? attendanceStatus[team._id] : true;
                const scheduleExists = prevReview ? scheduleStatus[team._id] : true;
                return (
                  <tr key={team._id}>
                    <td className="p-2 border">{team.teamName}</td>
                    <td className="p-2 border">
                      {scheduleExists ? (
                        attendanceMarked ? (
                          <select
                            value={assignments[idx]?.slot ? slots.findIndex(s => s.start === assignments[idx].slot.start && s.end === assignments[idx].slot.end) : ''}
                            onChange={e => handleAssignmentChange(team._id, e.target.value)}
                            className="border rounded px-2 py-1"
                          >
                            <option value="">Select Slot</option>
                            {slots.map((slot, sidx) => {
                              const start = new Date(slot.start);
                              const end = new Date(slot.end);
                              const slotStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                              const assignedToOther = assignments.some((a, aidx) => aidx !== idx && a.slot && a.slot.start === slot.start && a.slot.end === slot.end);
                              return (
                                <option key={sidx} value={sidx} disabled={assignedToOther}>{slotStr}</option>
                              );
                            })}
                          </select>
                        ) : (
                          <span className="text-red-600">Attendance not marked for previous review</span>
                        )
                      ) : (
                        <span className="text-red-600">Cannot schedule this review before scheduling the previous review</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            onClick={handleSubmitAssignments}
            disabled={loading}
          >
            {loading ? 'Assigning...' : 'Assign Slots'}
          </button>
          <button
            className="ml-4 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            onClick={() => { setStep(1); setSlots([]); setTeams([]); setAssignments([]); setMessage(''); setError(''); }}
            disabled={loading}
          >
            Back
          </button>
        </div>
      )}
      {/* Allotted Schedules Section */}
      <div className="bg-gray-50 mt-8 p-4 rounded-lg shadow-inner">
        <h3 className="text-xl font-semibold mb-4">Allotted Review Schedules</h3>
        {loadingSchedules ? (
          <div>Loading schedules...</div>
        ) : allottedSchedules.length === 0 ? (
          <div className="text-gray-500">No review schedules allotted yet.</div>
        ) : (
          <div className="space-y-4">
            {allottedSchedules.map(schedule => (
              <div key={schedule._id} className="border rounded-lg p-4 bg-white">
                <h4 className="text-lg font-semibold mb-2">{schedule.name} ({schedule.slotType})</h4>
                <p className="text-sm text-gray-700"><span className="font-semibold">Team:</span> {schedule.team?.teamName || 'N/A'}</p>
                <p className="text-sm text-gray-700"><span className="font-semibold">Panel:</span> {schedule.panel?.name || 'N/A'}</p>
                <p className="text-sm text-gray-700"><span className="font-semibold">Time:</span> {new Date(schedule.startTime).toLocaleString()} - {new Date(schedule.endTime).toLocaleString()}</p>
                <p className="text-sm text-gray-700"><span className="font-semibold">Duration:</span> {schedule.duration} minutes</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordinatorReviewSchedule; 