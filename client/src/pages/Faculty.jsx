import Tabs from './Tabs.jsx'; import { Postings, Companies, Policy, Applications, Evaluations, Reports } from './panels.jsx';
export default function Faculty({ user }) {
  return user.facultyType === 'coordinator'
    ? <Tabs tabs={{ Postings: <Postings />, Companies: <Companies />, Policy: <Policy />, Applications: <Applications /> }} />
    : <Tabs tabs={{ 'Review Certificates & Credits': <Evaluations /> }} />;
}
