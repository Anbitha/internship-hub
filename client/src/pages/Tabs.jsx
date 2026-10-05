import { useState } from 'react';
export default function Tabs({ tabs }) {
  const keys = Object.keys(tabs), [t, setT] = useState(keys[0]);
  return (<><nav className="tabs">{keys.map(k => <button key={k} className={k === t ? 'on' : ''} onClick={() => setT(k)}>{k}</button>)}</nav>{tabs[t]}</>);
}
export const Badge = ({ s }) => <span className={'badge ' + s}>{s}</span>;
