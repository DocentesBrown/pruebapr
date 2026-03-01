const { useEffect, useState, useMemo } = React;
const e = React.createElement;

const LS_KEY = 'preceptoria_app_state_v1';

// ====== HELPERS ======
function uid(prefix) { return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9); }
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { courses: {}, selectedCourseId: null };
    return JSON.parse(raw);
  } catch {
    return { courses: {}, selectedCourseId: null };
  }
}
function saveState(state) { localStorage.setItem(LS_KEY, JSON.stringify(state)); }

function sanitizePhone(phoneRaw=''){
  let d = String(phoneRaw).replace(/\D+/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  d = d.replace(/^54(9?)(\d{2,4})15(\d{7,8})$/, '54$1$2$3');
  if (!d.startsWith('54') && d.length >= 10 && d.length <= 11) d = '54' + d;
  if (d.startsWith('54') && d[2] !== '9') d = '54' + '9' + d.slice(2);
  d = d.replace(/^549(\d{2,4})15(\d{7,8})$/, '549$1$2');
  return d;
}

function buildRiskMessage(course, student, attendancePct, promedio){
  const courseName = course?.name || 'curso';
  const pName = student?.name || '';
  const msg = `Hola. Aviso de RIESGO PEDAGÓGICO para ${pName} (${courseName}). Asistencia global: ${attendancePct}%. Promedio institucional: ${promedio}. Por favor, acercarse a preceptoría.`;
  return encodeURIComponent(msg);
}

// ====== UI COMPONENTES BÁSICOS ======
function Button({ onClick, children, variant = 'primary', className = '', disabled = false }) {
  const styles = {
    primary: { background: 'var(--azul)', color: 'white' },
    secondary: { background: 'var(--violeta)', color: 'white' },
    danger: { background: 'var(--salmon)', color: 'white' },
    outline: { background: 'transparent', border: '1px solid var(--azul)', color: 'var(--azul)' }
  };
  return e('button', {
    onClick,
    disabled,
    className: `px-4 py-2 rounded-xl font-semibold shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${className}`,
    style: styles[variant]
  }, children);
}

// ====== MODALES ======
function NewCourseModal({ open, onClose, onCreate }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [shift, setShift] = useState('');
  const [subjectCount, setSubjectCount] = useState('');
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if (open) {
      setStep(1); setName(''); setShift(''); setSubjectCount(''); setSubjects([]);
    }
  }, [open]);

  function handleCountChange(e) {
    const val = parseInt(e.target.value, 10);
    setSubjectCount(e.target.value);
    if (!isNaN(val) && val > 0 && val <= 25) {
      const newSubs = [];
      for (let i = 0; i < val; i++) {
        newSubs.push(subjects[i] || { id: uid('sub'), name: '', days: '', modulos: '' });
      }
      setSubjects(newSubs);
    } else {
      setSubjects([]);
    }
  }

  function handleSubjectChange(idx, field, val) {
    const copy = [...subjects];
    copy[idx] = { ...copy[idx], [field]: val };
    setSubjects(copy);
  }

  function submit(ev) {
    ev && ev.preventDefault();
    if (step === 1) {
      if (!name.trim()) return alert('El Nombre del curso es obligatorio.');
      setStep(2);
    } else {
      const incomplete = subjects.some(s => !s.name.trim() || !s.days || !s.modulos);
      if (incomplete) {
        return alert('Debes completar el nombre, el día y el módulo para todas las materias.');
      }
      onCreate({ id: uid('curso'), name, shift, subjects, students: {} });
      onClose();
    }
  }

  if (!open) return null;

  const diasOptions = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const modulosOptions = ['1', '2', '3', '4', '5', '6'];

  return e('div', { className: 'fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50' },
    e('div', { className: 'bg-white rounded-3xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto' },
      e('div', { className: 'flex justify-between items-center mb-4' },
        e('h2', { className: 'text-xl font-bold', style: { color: 'var(--azul)' } }, step === 1 ? 'Crear Nuevo Curso' : 'Configurar Materias'),
        e('button', { onClick: onClose, className: 'text-slate-400 font-bold text-xl' }, '✕')
      ),
      e('form', { onSubmit: submit, className: 'space-y-4' },
        step === 1 ? e(React.Fragment, null,
          e('div', null, e('label', { className: 'block text-sm mb-1 font-medium' }, 'Nombre del curso (Ej: 1°A, 2°B, 3°1°)'), e('input', { value: name, onChange: ev => setName(ev.target.value), className: 'w-full px-3 py-2 border rounded-xl', autoFocus: true })),
          e('div', null, e('label', { className: 'block text-sm mb-1 font-medium' }, 'Turno (Opcional)'), e('input', { value: shift, onChange: ev => setShift(ev.target.value), className: 'w-full px-3 py-2 border rounded-xl' }))
        ) : e(React.Fragment, null,
          e('div', null, e('label', { className: 'block text-sm mb-1 font-medium' }, 'Cantidad total de materias'), e('input', { type: 'number', min: 1, max: 25, value: subjectCount, onChange: handleCountChange, className: 'w-full px-3 py-2 border rounded-xl' })),
          subjects.map((sub, i) => e('div', { key: i, className: 'border p-3 rounded-xl bg-slate-50 space-y-2' },
            e('div', { className: 'font-bold text-sm', style: { color: 'var(--violeta)' } }, `Materia ${i + 1}`),
            e('input', { placeholder: 'Nombre de la materia', value: sub.name, onChange: ev => handleSubjectChange(i, 'name', ev.target.value), className: 'w-full px-2 py-1 border rounded' }),
            e('div', { className: 'flex gap-2' },
              e('select', { value: sub.days, onChange: ev => handleSubjectChange(i, 'days', ev.target.value), className: 'w-1/2 px-2 py-1 border rounded bg-white' },
                e('option', { value: '' }, 'Día...'),
                diasOptions.map(d => e('option', { key: d, value: d }, d))
              ),
              e('select', { value: sub.modulos, onChange: ev => handleSubjectChange(i, 'modulos', ev.target.value), className: 'w-1/2 px-2 py-1 border rounded bg-white' },
                e('option', { value: '' }, 'Módulo...'),
                modulosOptions.map(m => e('option', { key: m, value: m }, m))
              )
            )
          ))
        ),
        e('div', { className: 'flex justify-end gap-2 pt-4' },
          step === 2 && e(Button, { type: 'button', variant: 'outline', onClick: () => setStep(1) }, 'Volver'),
          e(Button, { type: 'submit', variant: 'primary' }, step === 1 ? 'Siguiente' : 'Finalizar')
        )
      )
    )
  );
}

function NewStudentModal({ open, course, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [allSubjects, setAllSubjects] = useState(true);
  const [selectedSubjects, setSelectedSubjects] = useState({});

  useEffect(() => {
    if (open && course) {
      setName(''); setAllSubjects(true);
      const sel = {};
      (course.subjects || []).forEach(s => sel[s.id] = true);
      setSelectedSubjects(sel);
    }
  }, [open, course]);

  function toggleSub(id) { setSelectedSubjects(prev => ({ ...prev, [id]: !prev[id] })); }

  function submit(ev) {
    ev && ev.preventDefault();
    if (!name.trim()) return;
    const enrolled = allSubjects ? (course.subjects || []).map(s => s.id) : Object.keys(selectedSubjects).filter(k => selectedSubjects[k]);
    onAdd({ id: uid('st'), name, subjects_enrolled: enrolled, external_subjects: {}, grades: {}, attendance: {} });
    onClose();
  }

  if (!open || !course) return null;

  return e('div', { className: 'fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50' },
    e('div', { className: 'bg-white rounded-3xl p-6 w-full max-w-md shadow-xl' },
      e('h2', { className: 'text-xl font-bold mb-4', style: { color: 'var(--azul)' } }, 'Agregar Estudiante al Curso'),
      e('form', { onSubmit: submit, className: 'space-y-4' },
        e('div', null, e('label', { className: 'block text-sm mb-1 font-medium' }, 'Apellido y Nombre'), e('input', { value: name, onChange: ev => setName(ev.target.value), className: 'w-full px-3 py-2 border rounded-xl', autoFocus: true })),
        e('div', { className: 'border-t pt-3' },
          e('label', { className: 'flex items-center gap-2 mb-2 font-semibold' },
            e('input', { type: 'checkbox', checked: allSubjects, onChange: e => setAllSubjects(e.target.checked), className: 'w-4 h-4' }), 'Cursa todas las materias del curso'
          ),
          !allSubjects && e('div', { className: 'max-h-48 overflow-y-auto space-y-1 bg-slate-50 p-3 rounded-xl border' },
            (course.subjects || []).map(sub => e('label', { key: sub.id, className: 'flex items-center gap-2 text-sm mb-2' },
              e('input', { type: 'checkbox', checked: !!selectedSubjects[sub.id], onChange: () => toggleSub(sub.id) }), sub.name
            ))
          )
        ),
        e('div', { className: 'flex justify-end gap-2 pt-2' },
          e(Button, { type: 'button', variant: 'outline', onClick: onClose }, 'Cancelar'), e(Button, { type: 'submit', variant: 'danger' }, 'Guardar Estudiante')
        )
      )
    )
  );
}

function GradesModal({ open, student, course, onClose, onSave }) {
  const [subjectId, setSubjectId] = useState('');
  const [grades, setGrades] = useState({});

  useEffect(() => {
    if (open && student && course) {
      setSubjectId(course.subjects?.[0]?.id || '');
      setGrades(student.grades || {});
    }
  }, [open, student, course]);

  if (!open || !student || !course) return null;

  const instances = [
    { id: '1er_cuat', label: 'Primer Cuatrimestre' },
    { id: '2do_cuat', label: 'Segundo Cuatrimestre' },
    { id: 'int_dic', label: 'Intensificación Diciembre' },
    { id: 'int_feb', label: 'Intensificación Febrero' },
    { id: 'int_jun', label: 'Intensificación Junio' }
  ];

  function handleGradeChange(instId, val) {
    const subjectGrades = { ...(grades[subjectId] || {}) };
    subjectGrades[instId] = val;
    setGrades(prev => ({ ...prev, [subjectId]: subjectGrades }));
  }

  const currentSubjectGrades = grades[subjectId] || {};
  const currentSubjectValues = Object.values(currentSubjectGrades).map(v => Number(v)).filter(v => !Number.isNaN(v) && v > 0);
  const avgSubj = currentSubjectValues.length ? Math.round((currentSubjectValues.reduce((a,b)=>a+b,0) / currentSubjectValues.length)*100)/100 : '-';

  const isEnrolled = student.subjects_enrolled?.includes(subjectId);
  const externalData = student.external_subjects?.[subjectId];

  return e('div', { className: 'fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50' },
    e('div', { className: 'bg-white rounded-3xl p-6 w-full max-w-md shadow-xl' },
      e('div', { className: 'flex justify-between items-center mb-4' },
        e('h2', { className: 'text-xl font-bold', style: { color: 'var(--violeta)' } }, 'Editar Calificaciones'),
        e('button', { onClick: onClose, className: 'text-slate-400 font-bold text-xl' }, '✕')
      ),
      e('div', { className: 'mb-4 text-center font-bold text-lg border-b pb-2' }, student.name),
      e('div', { className: 'mb-4 flex items-center gap-2' },
        e('div', { className: 'flex-1' },
          e('label', { className: 'block text-sm mb-1 font-medium' }, 'Materia:'),
          e('select', { value: subjectId, onChange: e => setSubjectId(e.target.value), className: 'w-full px-3 py-2 border rounded-xl' },
            (course.subjects || []).map(s => e('option', { key: s.id, value: s.id }, s.name))
          )
        ),
        e('div', { className: 'w-24 text-center bg-slate-100 rounded-xl p-2' },
          e('div', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Promedio'),
          e('div', { className: 'text-xl font-bold ' + (avgSubj !== '-' && avgSubj < 7 ? 'text-red-600' : 'text-slate-800') }, avgSubj)
        )
      ),
      !isEnrolled ? e('div', { className: 'bg-red-50 text-red-700 p-3 rounded-xl text-sm mb-4 text-center border border-red-200' },
        externalData 
          ? `Recursando/Rindiendo desde: ${externalData.year} (${externalData.subject_name})`
          : 'Este estudiante no cursa regularmente esta materia.'
      ) : null,
      e('div', { className: 'space-y-3' },
        instances.map(inst => e('div', { key: inst.id, className: 'flex items-center justify-between bg-slate-50 p-2 rounded-xl border' },
          e('span', { className: 'text-sm font-medium text-slate-700' }, inst.label),
          e('input', { type: 'text', disabled: !isEnrolled && !externalData, value: currentSubjectGrades[inst.id] || '', onChange: e => handleGradeChange(inst.id, e.target.value), className: 'w-16 px-2 py-1 border rounded-lg text-center font-bold', placeholder: '-' })
        ))
      ),
      e('div', { className: 'flex justify-end gap-2 pt-6' },
        e(Button, { variant: 'outline', onClick: onClose }, 'Cancelar'), e(Button, { variant: 'primary', onClick: () => { onSave(student.id, grades); onClose(); } }, 'Guardar Notas')
      )
    )
  );
}

function AttendanceConfigModal({ open, course, onClose, onStart }) {
  const [subjectId, setSubjectId] = useState('');
  const [day, setDay] = useState('');

  useEffect(() => {
    if (open && course) {
      setSubjectId(course.subjects?.[0]?.id || '');
      setDay('');
    }
  }, [open, course]);

  if (!open || !course) return null;

  return e('div', { className: 'fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50' },
    e('div', { className: 'bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl' },
      e('h2', { className: 'text-xl font-bold mb-4', style: { color: 'var(--azul)' } }, 'Configurar Asistencia'),
      e('div', { className: 'space-y-4' },
        e('div', null,
          e('label', { className: 'block text-sm mb-1 font-medium' }, 'Día de la semana'),
          e('select', { value: day, onChange: e => setDay(e.target.value), className: 'w-full px-3 py-2 border rounded-xl' },
            e('option', { value: '' }, '-- Seleccionar --'),
            ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(d => e('option', { key: d, value: d }, d))
          )
        ),
        e('div', null,
          e('label', { className: 'block text-sm mb-1 font-medium' }, 'Materia actual'),
          e('select', { value: subjectId, onChange: e => setSubjectId(e.target.value), className: 'w-full px-3 py-2 border rounded-xl' },
            (course.subjects || []).map(s => e('option', { key: s.id, value: s.id }, s.name))
          )
        ),
        e('div', { className: 'flex justify-end gap-2 pt-4' },
          e(Button, { variant: 'outline', onClick: onClose }, 'Cancelar'),
          e(Button, { variant: 'primary', onClick: () => { if(day && subjectId) onStart(subjectId, day); else alert('Completá ambos campos'); } }, 'Comenzar')
        )
      )
    )
  );
}

function AttendanceView({ course, subjectId, day, onClose, onSaveAttendance }) {
  const students = Object.values(course.students || {}).sort((a, b) => a.name.localeCompare(b.name));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [records, setRecords] = useState({});
  const [ops, setOps] = useState([]);

  if (!students.length) return e('div', { className: 'p-12 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-300' }, 'No hay estudiantes en este curso.');

  if (currentIndex >= students.length) {
    return e('div', { className: 'bg-white rounded-3xl p-8 text-center shadow-sm border border-slate-200' },
      e('div', { className: 'text-5xl mb-4' }, '✅'),
      e('h2', { className: 'text-2xl font-bold mb-2', style: { color: 'var(--azul)' } }, '¡Lista completada!'),
      e('p', { className: 'mb-8 text-slate-600 font-medium' }, `Finalizaste la asistencia de ${students.length} estudiantes.`),
      e('div', { className: 'flex justify-center gap-3' },
        e(Button, { variant: 'outline', onClick: onClose }, 'Cancelar'),
        e(Button, { variant: 'primary', onClick: () => onSaveAttendance(subjectId, records) }, 'Guardar Asistencia')
      )
    );
  }

  const student = students[currentIndex];
  const isEnrolled = student.subjects_enrolled?.includes(subjectId);
  const externalData = student.external_subjects?.[subjectId];

  let statusBadge = null;
  let statusBg = '';
  if (isEnrolled) {
    statusBadge = 'Cursa Regularmente';
    statusBg = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  } else if (externalData) {
    statusBadge = `Recursante / Rinde (${externalData.year})`;
    statusBg = 'bg-amber-100 text-amber-800 border-amber-200';
  } else {
    statusBadge = 'No cursa esta materia';
    statusBg = 'bg-rose-100 text-rose-800 border-rose-200';
  }

  function mark(status) {
    setRecords(prev => ({ ...prev, [student.id]: status }));
    setOps(prev => [...prev, { studentId: student.id, status }]);
    setCurrentIndex(i => i + 1);
  }

  function undo() {
    if (ops.length === 0) return;
    const last = ops[ops.length - 1];
    setOps(prev => prev.slice(0, -1));
    const newRecords = { ...records };
    delete newRecords[last.studentId];
    setRecords(newRecords);
    setCurrentIndex(i => Math.max(0, i - 1));
  }

  return e('div', { className: 'max-w-md mx-auto bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200' },
    e('div', { className: 'p-4 bg-slate-50 flex justify-between items-center border-b border-slate-200' },
      e('div', { className: 'text-sm font-bold', style: { color: 'var(--violeta)' } }, `${day} • ${(course.subjects.find(s=>s.id===subjectId)||{}).name}`),
      e('div', { className: 'text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-lg' }, `${currentIndex + 1} / ${students.length}`)
    ),
    e('div', { className: 'px-6 py-10 text-center flex flex-col items-center justify-center min-h-[200px]' },
      e('span', { className: `text-xs font-bold px-3 py-1 rounded-full border mb-4 uppercase tracking-wide shadow-sm ${statusBg}` }, statusBadge),
      e('h2', { className: 'text-3xl font-bold leading-tight', style: { color: 'var(--azul)' } }, student.name),
      (!isEnrolled && !externalData) && e('p', { className: 'text-sm text-slate-500 mt-4 max-w-[250px]' }, 'Este estudiante no está inscripto ni vinculado institucionalmente a esta materia hoy.')
    ),
    e('div', { className: 'p-4 bg-slate-50 grid grid-cols-3 gap-3 border-t border-slate-200' },
      e('button', { onClick: () => mark('present'), className: 'py-5 rounded-2xl font-bold text-white shadow-sm flex flex-col items-center gap-2 transform active:scale-95 transition-transform', style: { background: '#16a34a' } }, e('span', { className: 'text-3xl' }, '🙋‍♂️'), 'Presente'),
      e('button', { onClick: () => mark('absent'), className: 'py-5 rounded-2xl font-bold text-white shadow-sm flex flex-col items-center gap-2 transform active:scale-95 transition-transform', style: { background: 'var(--salmon)' } }, e('span', { className: 'text-3xl' }, '❌'), 'Ausente'),
      e('button', { onClick: () => mark('later'), className: 'py-5 rounded-2xl font-bold text-slate-800 shadow-sm flex flex-col items-center gap-2 bg-amber-300 transform active:scale-95 transition-transform' }, e('span', { className: 'text-3xl' }, '⏱'), 'Tarde')
    ),
    e('div', { className: 'p-4 flex justify-between items-center bg-white' },
      e('button', { onClick: undo, disabled: ops.length === 0, className: `font-bold px-4 py-2 rounded-xl transition-colors ${ops.length > 0 ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}` }, '⟲ Deshacer'),
      e('button', { onClick: () => mark('skipped'), className: 'font-bold px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100' }, 'Omitir ⏭')
    )
  );
}

// ====== APP PRINCIPAL ======
function MainApp() {
  const [state, setState] = useState(loadState());
  const [newCourseOpen, setNewCourseOpen] = useState(false);
  const [newStudentOpen, setNewStudentOpen] = useState(false);
  const [gradesStudentId, setGradesStudentId] = useState(null);
  
  const [attendanceConfigOpen, setAttendanceConfigOpen] = useState(false);
  const [activeAttendance, setActiveAttendance] = useState(null); 

  useEffect(() => { saveState(state); }, [state]);

  const course = state.selectedCourseId ? state.courses[state.selectedCourseId] : null;

  function createCourse(courseData) {
    setState(s => ({ ...s, selectedCourseId: courseData.id, courses: { ...s.courses, [courseData.id]: courseData } }));
  }

  function addStudent(studentData) {
    setState(s => {
      const c = { ...s.courses[s.selectedCourseId] };
      c.students = { ...c.students, [studentData.id]: studentData };
      return { ...s, courses: { ...s.courses, [s.selectedCourseId]: c } };
    });
  }

  function saveGrades(studentId, gradesData) {
    setState(s => {
      const c = { ...s.courses[s.selectedCourseId] };
      const st = { ...c.students[studentId], grades: gradesData };
      c.students = { ...c.students, [studentId]: st };
      return { ...s, courses: { ...s.courses, [s.selectedCourseId]: c } };
    });
  }

  function setExternalSubject(studentId) {
    const sId = prompt('¿ID/Nombre exacto de la materia para vincular externamente?');
    const yearOrigin = prompt('¿En qué curso de origen la cursa? (Ej: 2°A)');
    if(!sId || !yearOrigin) return;
    setState(s => {
       const c = { ...s.courses[s.selectedCourseId] };
       const st = { ...c.students[studentId] };
       st.external_subjects = { ...st.external_subjects, [sId]: { year: yearOrigin, subject_name: sId } };
       c.students = { ...c.students, [studentId]: st };
       return { ...s, courses: { ...s.courses, [s.selectedCourseId]: c } };
    });
  }

  function handleSaveAttendance(subjectId, records) {
    setState(s => {
      const c = { ...s.courses[s.selectedCourseId] };
      const today = new Date().toISOString().split('T')[0];
      
      Object.entries(records).forEach(([stId, status]) => {
        if (status === 'skipped') return; 
        
        const st = { ...c.students[stId] };
        if (!st.attendance) st.attendance = {};
        if (!st.attendance[subjectId]) st.attendance[subjectId] = { present: 0, absent: 0, later: 0, history: [] };
        
        const att = { ...st.attendance[subjectId] };
        if (status === 'present') att.present += 1;
        if (status === 'absent') att.absent += 1;
        if (status === 'later') att.later += 1;
        
        att.history = [...att.history, { id: uid('hist'), date: today, status }];
        st.attendance[subjectId] = att;
        c.students[stId] = st;
      });
      return { ...s, courses: { ...s.courses, [s.selectedCourseId]: c } };
    });
    setActiveAttendance(null);
  }

  const coursesList = Object.values(state.courses);

  if (activeAttendance && course) {
    return e('div', { className: 'min-h-dvh' },
      e('header',
        { className: 'w-full p-4 md:p-6 text-white flex items-center justify-between sticky top-0 z-10 shadow', style:{ background:'#24496e' } },
        e('div', { className:'flex flex-col gap-1' },
          e('div', { className:'flex items-center gap-3' }, e('span', { className:'text-2xl md:text-3xl font-bold tracking-tight' }, 'Preceptoría')),
          e('span', { className:'text-xs md:text-sm underline', style:{ opacity:.9 } }, 'creado por @docentesbrown')
        ),
        e('button', { onClick:()=>setActiveAttendance(null), className:'px-3 py-2 rounded-xl text-sm font-semibold', style:{ background:'#f3efdc', color:'#24496e' } }, '← Volver')
      ),
      e('main', { className:'max-w-5xl mx-auto p-4 md:p-6' },
        e(AttendanceView, { course, subjectId: activeAttendance.subjectId, day: activeAttendance.day, onClose: () => setActiveAttendance(null), onSaveAttendance: handleSaveAttendance })
      )
    );
  }

  return e('div', { className:'min-h-dvh' },
    e('header',
      { className: 'w-full p-4 md:p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sticky top-0 z-10 shadow', style:{ background:'#24496e' } },
      e('div', { className:'flex flex-col gap-1' },
        e('div', { className:'flex items-center gap-3' }, e('span', { className:'text-2xl md:text-3xl font-bold tracking-tight' }, 'Preceptoría')),
        e('span', { className:'text-xs md:text-sm underline', style:{ opacity:.9 } }, 'creado por @docentesbrown')
      ),
      e('div', { className:'flex gap-2 flex-wrap w-full md:w-auto' },
        e('select', { value: state.selectedCourseId || '', onChange: e => setState({ ...state, selectedCourseId: e.target.value }), className:'rounded-md px-2 py-2 text-sm min-w-[200px]', style:{ color:'#24496e' } },
          e('option', { value: '' }, '-- Seleccionar Curso --'),
          coursesList.map(c => e('option', { key: c.id, value: c.id }, c.name))
        ),
        course && e('button', { onClick: () => setAttendanceConfigOpen(true), className:'px-3 py-2 rounded-xl text-sm font-semibold', style:{ background:'#6c467e', color:'#fff' } }, '📋 Tomar asistencia'),
        e('button', { onClick: () => setNewCourseOpen(true), className:'px-3 py-2 rounded-xl text-sm font-semibold', style:{ background:'#f3efdc', color:'#24496e' } }, '+ Nuevo curso')
      )
    ),

    e('main', { className:'max-w-5xl mx-auto' },
      Object.keys(state.courses).length === 0
        ? e('div', { className:'p-6 md:p-10 text-center' },
            e('h2', { className:'text-xl md:text-2xl font-semibold mb-2', style:{ color:'#24496e' } }, 'No hay cursos aún'),
            e('p', { className:'text-slate-700 mb-4' }, 'Creá tu primer curso para comenzar.'),
            e('button', { onClick:()=>setNewCourseOpen(true), className:'px-4 py-2 rounded-2xl text-white shadow', style:{ background:'#6c467e' } }, '+ Nuevo curso')
          )
        : e('div', { className:'w-full overflow-x-auto border-b border-slate-300 bg-white' },
            e('div', { className:'flex items-center gap-2 p-3 min-w-max' },
              ...coursesList.map(c => e('button', { key:c.id, onClick:()=>setState({ ...state, selectedCourseId: c.id }), className:'px-3 py-2 rounded-2xl border text-sm font-medium', style: state.selectedCourseId===c.id ? { borderColor:'#24496e', background:'#f0f4f8', color:'#24496e' } : { borderColor:'#d7dbe0', color:'#334155' } }, c.name)),
              e('button', { onClick:()=>setNewCourseOpen(true), className:'px-3 py-2 rounded-2xl text-sm', style:{ background:'#f3efdc', color:'#24496e' } }, '+ Nuevo curso')
            )
          ),

      course
        ? e('div', { className:'p-4 md:p-6' },
            e('div', { className:'bg-white rounded-2xl shadow border', style:{ borderColor:'#cbd5e1' } },
              e('div', { className:'p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b', style:{ borderColor:'#e2e8f0' } },
                e('div', null,
                  e('h2', { className:'text-2xl font-bold', style:{ color:'#6c467e' } }, course.name),
                  e('p', { className:'text-sm text-slate-500 font-medium mt-1' }, `Turno ${course.shift || 'N/A'} • ${course.subjects.length} materias`)
                ),
                e('button', { onClick: () => setNewStudentOpen(true), className:'px-4 py-2 rounded-xl text-white font-semibold', style:{ background:'#da6863' } }, '+ Agregar estudiante')
              ),
              e('div', { className:'overflow-x-auto' },
                e('table', { className:'w-full text-left border rounded-xl overflow-hidden', style:{ borderColor:'#cbd5e1' } },
                  e('thead', { style:{ background:'#24496e', color:'#ffffff' } },
                    e('tr', null,
                      e('th', { className:'p-3 text-sm' }, 'Estudiante'),
                      e('th', { className:'p-3 text-sm text-center hidden md:table-cell' }, 'Materias'),
                      e('th', { className:'p-3 text-sm text-center', title:'Presentes globales' }, 'P'),
                      e('th', { className:'p-3 text-sm text-center', title:'Ausentes globales' }, 'A'),
                      e('th', { className:'p-3 text-sm text-center' }, '% Asistencia'),
                      e('th', { className:'p-3 text-sm text-center' }, 'Promedio'),
                      e('th', { className:'p-3 text-sm text-center' }, 'Acciones')
                    )
                  ),
                  e('tbody', null,
                    ...Object.values(course.students || {}).map((st, idx) => {
                      const totalSubs = course.subjects.length;
                      const cursaSubs = (st.subjects_enrolled || []).length;
                      const isRegular = cursaSubs === totalSubs;
                      let totalPresent = 0; let totalAbsent = 0;
                      if (st.attendance) {
                        Object.values(st.attendance).forEach(att => { totalPresent += (att.present || 0); totalAbsent += (att.absent || 0); });
                      }
                      const d = totalPresent + totalAbsent;
                      const attendancePct = d ? Math.round((totalPresent / d) * 100) : 0;
                      let allGrades = [];
                      if (st.grades) {
                        Object.values(st.grades).forEach(subjGrades => {
                          Object.values(subjGrades).forEach(val => {
                            const num = Number(val);
                            if (!Number.isNaN(num) && val !== '') allGrades.push(num);
                          });
                        });
                      }
                      const promedio = allGrades.length ? Math.round((allGrades.reduce((a, b) => a + b, 0) / allGrades.length) * 100) / 100 : '-';
                      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f3efdc';
                      return e('tr', { key: st.id, style:{ background:rowBg, borderTop:'1px solid #cbd5e1' } },
                        e('td', { className:'p-3 font-medium' }, st.name),
                        e('td', { className:'p-3 text-center hidden md:table-cell' },
                          isRegular ? e('span', { className:'text-xs px-2 py-1 rounded-full font-bold', style:{ background:'#e8f7ef', color:'#166534' } }, 'Todas')
                                    : e('span', { className:'text-xs px-2 py-1 rounded-full font-bold', style:{ background:'#fff3cd', color:'#92400e' } }, `${cursaSubs}/${totalSubs}`)
                        ),
                        e('td', { className:'p-3 text-center text-sm font-medium', style:{ color:'#166534' } }, totalPresent),
                        e('td', { className:'p-3 text-center text-sm font-medium', style:{ color:'#da6863' } }, totalAbsent),
                        e('td', { className:'p-3 text-center text-sm font-semibold', style: d > 0 && attendancePct < 60 ? { color:'#991b1b', background:'#fdecea', borderRadius:'8px' } : { color:'#24496e' } }, d > 0 ? `${attendancePct}%` : '-'),
                        e('td', { className:'p-3 text-center text-sm font-semibold', style: (promedio !== '-' && promedio < 7) ? { color:'#991b1b' } : { color:'#24496e' } }, promedio),
                        e('td', { className:'p-3 text-right' },
                          e('div', { className:'flex gap-2 justify-end flex-wrap' },
                            e('button', { onClick: () => setGradesStudentId(st.id), className:'text-xs px-3 py-1 rounded', style:{ background:'#f0eaf5', color:'#6c467e' } }, 'Notas'),
                            e('button', { onClick: () => {
                                const phone = prompt('Número de WhatsApp del tutor o estudiante (Ej: 1122334455):', '');
                                if(!phone) return;
                                const cleanPhone = sanitizePhone(phone);
                                const msg = buildRiskMessage(course, st, attendancePct, promedio);
                                window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                              }, className:'text-xs px-3 py-1 rounded', style:{ background:'#fde2e0', color:'#da6863' } }, 'Riesgo'),
                            !isRegular && e('button', { onClick: () => setExternalSubject(st.id), className:'text-xs px-3 py-1 rounded', style:{ background:'#f3efdc', color:'#92400e' } }, 'Ext.')
                          )
                        )
                      );
                    }),
                    ...(Object.keys(course.students || {}).length === 0 ? [e('tr', { key:'empty' }, e('td', { colSpan:7, className:'p-4 text-center text-slate-500' }, 'Aún no hay estudiantes registrados en este curso.'))] : [])
                  )
                )
              )
            )
          )
        : (Object.keys(state.courses).length > 0 ? e('div', { className:'p-6 md:p-10 text-center' },
            e('h2', { className:'text-xl md:text-2xl font-semibold mb-2', style:{ color:'#24496e' } }, 'Seleccioná un curso'),
            e('p', { className:'text-slate-700 mb-4' }, 'Usá la barra superior para elegir un curso.')
          ) : null)
    ),

    e(NewCourseModal, { open: newCourseOpen, onClose: () => setNewCourseOpen(false), onCreate: createCourse }),
    e(NewStudentModal, { open: newStudentOpen, course, onClose: () => setNewStudentOpen(false), onAdd: addStudent }),
    e(AttendanceConfigModal, { open: attendanceConfigOpen, course, onClose: () => setAttendanceConfigOpen(false), onStart: (subjectId, day) => { setAttendanceConfigOpen(false); setActiveAttendance({ subjectId, day }); } }),
    e(GradesModal, { open: !!gradesStudentId, student: course?.students[gradesStudentId], course, onClose: () => setGradesStudentId(null), onSave: saveGrades })
  );
}

const rootEl = document.getElementById('root');
const root = ReactDOM.createRoot(rootEl);
root.render(e(MainApp));
