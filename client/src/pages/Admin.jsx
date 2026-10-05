import Tabs from './Tabs.jsx'; import { Users, Activity, Postings, Companies, Policy, Applications, Evaluations, Reports } from './panels.jsx';
export default function Admin() {
  return <Tabs tabs={{ Users: <Users />, Activity: <Activity />, Postings: <Postings ro />, Companies: <Companies ro />, Policy: <Policy ro />, Applications: <Applications ro />, Evaluations: <Evaluations ro />, Reports: <Reports ro /> }} />;
}
