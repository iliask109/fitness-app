import { useEffect, useState } from 'react';
import { missingUpdates, SQL_FILE_URL } from '../lib/schemaCheck';

/** Admin-only: lists SQL updates that were not run, since the app then saves without those fields. */
export default function SchemaWarning() {
  const [missing, setMissing] = useState<string[]>([]);
  useEffect(() => { missingUpdates().then(setMissing).catch(() => {}); }, []);
  if (!missing.length) return null;
  return (
    <div className="card schema-warning stack tight" role="alert">
      <strong>⚠️ מסד הנתונים לא מעודכן</strong>
      <span className="small">עד שהעדכונים האלה ירוצו, חלק מהמידע לא יישמר. ב-Supabase: SQL Editor ← New query ← להדביק את הקובץ ← Run.</span>
      <ul className="small" style={{ margin: 0, paddingInlineStart: 20 }}>
        {missing.map((f) => <li key={f}><a href={SQL_FILE_URL(f)} target="_blank" rel="noopener noreferrer" dir="ltr">{f}</a></li>)}
      </ul>
    </div>
  );
}
