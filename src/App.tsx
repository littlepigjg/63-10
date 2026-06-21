import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Configs from '@/pages/Configs';
import Encryption from '@/pages/Encryption';
import Logs from '@/pages/Logs';
import AuditLogs from '@/pages/AuditLogs';
import Clients from '@/pages/Clients';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/configs" element={<Configs />} />
          <Route path="/encryption" element={<Encryption />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/clients" element={<Clients />} />
        </Route>
      </Routes>
    </Router>
  );
}
