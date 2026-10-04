import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CommandPaletteModal from './components/CommandPaletteModal';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RawMaterials from './pages/RawMaterials';
import Production from './pages/Production';
import QualityControl from './pages/QualityControl';
import Logistics from './pages/Logistics';
import Procurement from './pages/Procurement';
import Suppliers from './pages/Suppliers';
import AdminSettings from './pages/AdminSettings';
import AiAssistant from './pages/AiAssistant';
import WarehouseManagement from './pages/WarehouseManagement';
import StockTransfers from './pages/StockTransfers';
import { getDefaultLandingTab, getPrimaryRoleConfig } from './utils/rbac';

function MainLayout() {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Auto-route to the default landing page according to user's assigned RBAC role
  useEffect(() => {
    if (user && user.roles) {
      const defaultTab = getDefaultLandingTab(user.roles);
      setActiveTab(defaultTab);
    }
  }, [user]);

  if (!isAuthenticated) {
    return <Login />;
  }

  const roleConfig = getPrimaryRoleConfig(user?.roles);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'dashboard-executive':
      case 'dashboard-ai':
        return <Dashboard onNavigate={setActiveTab} initialRoleTab={activeTab} />;
      case 'raw-materials':
        return <RawMaterials />;
      case 'procurement':
        return <Procurement />;
      case 'production':
        return <Production />;
      case 'quality':
        return <QualityControl />;
      case 'warehouse':
        return <WarehouseManagement />;
      case 'stock-transfers':
        return <StockTransfers />;
      case 'logistics':
        return <Logistics />;
      case 'suppliers':
        return <Suppliers />;
      case 'admin':
        return <AdminSettings />;
      case 'ai-copilot':
        return <AiAssistant />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)', overflow: 'hidden' }}>
      <Header 
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} 
        roleConfig={roleConfig} 
        onNavigate={setActiveTab} 
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userRoles={user?.roles} />
        <main style={{ flex: 1, overflow: 'hidden', background: 'var(--bg-app)' }}>
          {renderActivePage()}
        </main>
      </div>

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActiveTab}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
