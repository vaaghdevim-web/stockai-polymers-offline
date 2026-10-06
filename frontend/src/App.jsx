import React, { useState, useEffect } from 'react';
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
import BarcodeScannerModal from './components/BarcodeScannerModal';
import BarcodeGeneratorModal from './components/BarcodeGeneratorModal';
import PalletLabelModal from './components/PalletLabelModal';
import CreateStockTransferModal from './components/CreateStockTransferModal';
import { ShieldAlert } from 'lucide-react';
import { getDefaultLandingTab, getPrimaryRoleConfig, isTabAllowed } from './utils/rbac';
import { getViewMode, applyViewMode } from './utils/viewMode';

function MainLayout() {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [viewMode, setViewModeState] = useState(() => getViewMode());

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isBarcodeGeneratorOpen, setIsBarcodeGeneratorOpen] = useState(false);
  const [isPalletLabelOpen, setIsPalletLabelOpen] = useState(false);
  const [activeLabelPallet, setActiveLabelPallet] = useState(null);

  // Inter-unit Stock Transfer Modal State
  const [isStockTransferOpen, setIsStockTransferOpen] = useState(false);
  const [stockTransferPrefill, setStockTransferPrefill] = useState(null);

  // Responsive window resize tracking
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Viewport View Mode on Mount
  useEffect(() => {
    applyViewMode(viewMode);
  }, [viewMode]);

  const handleToggleViewMode = () => {
    const nextMode = viewMode === 'desktop' ? 'mobile' : 'desktop';
    setViewModeState(nextMode);
    applyViewMode(nextMode);
  };

  const handleToggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => !prev);
    }
  };

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
    // RBAC Frontend Route Guard: Block unauthorized page access
    if (!isTabAllowed(activeTab, user?.roles)) {
      return (
        <div style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            background: '#FFFFFF',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '36px 28px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--accent-coral-light)',
              border: '1px solid var(--accent-coral-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={28} color="var(--accent-coral)" />
            </div>
            <div>
              <h2 className="font-heading" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                Module Access Restricted
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Your current role <span className="font-mono" style={{ color: '#0284C7', fontWeight: '600' }}>{roleConfig.displayName}</span> does not have authorization to view this module.
              </p>
            </div>
            <button
              onClick={() => setActiveTab(roleConfig.defaultTab)}
              className="btn btn-primary"
              style={{ marginTop: '8px', fontSize: '12px' }}
            >
              Return to {roleConfig.displayName} Workspace
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
      case 'dashboard-executive':
      case 'dashboard-ai':
        return <Dashboard onNavigate={setActiveTab} initialRoleTab={activeTab} />;
      case 'raw-materials':
        return <RawMaterials onNavigate={setActiveTab} />;
      case 'procurement':
        return <Procurement onNavigate={setActiveTab} />;
      case 'production':
        return <Production onNavigate={setActiveTab} />;
      case 'quality':
        return <QualityControl onNavigate={setActiveTab} />;
      case 'warehouse':
        return <WarehouseManagement onNavigate={setActiveTab} />;
      case 'stock-transfers':
        return <StockTransfers onNavigate={setActiveTab} />;
      case 'logistics':
        return (
          <Logistics 
            onNavigate={setActiveTab} 
            onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)} 
            onOpenBarcodeGenerator={() => setIsBarcodeGeneratorOpen(true)}
          />
        );
      case 'suppliers':
        return <Suppliers onNavigate={setActiveTab} />;
      case 'admin':
        return <AdminSettings onNavigate={setActiveTab} />;
      case 'ai-copilot':
        return <AiAssistant onNavigate={setActiveTab} />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', background: 'var(--bg-app)', overflow: 'hidden', position: 'relative' }}>
      
      {/* Mobile Backdrop Overlay */}
      {isMobile && (
        <div 
          className={`sidebar-backdrop ${isMobileSidebarOpen ? 'active' : ''}`} 
          onClick={() => setIsMobileSidebarOpen(false)} 
        />
      )}

      {/* Left Sidebar (Desktop Fixed / Mobile Slide-out Drawer) */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        userRoles={user?.roles} 
        isCollapsed={isSidebarCollapsed}
        isMobile={isMobile}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Right Content Section (Header + Scrollable Body) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, height: '100%' }}>
        <Header 
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} 
          onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
          onOpenBarcodeGenerator={() => setIsBarcodeGeneratorOpen(true)}
          roleConfig={roleConfig} 
          onNavigate={setActiveTab}
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          isMobile={isMobile}
        />
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-app)', minWidth: 0, height: 'calc(100vh - var(--header-height))', WebkitOverflowScrolling: 'touch' }}>
          {renderActivePage()}
        </main>
      </div>

      {/* Global Command Palette Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActiveTab}
        userRoles={user?.roles}
      />

      {/* Global Barcode Scanner Modal (Dedicated Unit) */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onOpenLabelModal={(pallet) => {
          setActiveLabelPallet(pallet);
          setIsPalletLabelOpen(true);
        }}
        onOpenStockTransfer={(prefill) => {
          setStockTransferPrefill(prefill);
          setIsStockTransferOpen(true);
        }}
        onNavigate={setActiveTab}
      />

      {/* Global Barcode & QR Generator Studio (Dedicated Unit) */}
      <BarcodeGeneratorModal
        isOpen={isBarcodeGeneratorOpen}
        onClose={() => setIsBarcodeGeneratorOpen(false)}
        onOpenLabelModal={(pallet) => {
          setActiveLabelPallet(pallet);
          setIsPalletLabelOpen(true);
        }}
        onOpenStockTransfer={(prefill) => {
          setStockTransferPrefill(prefill);
          setIsStockTransferOpen(true);
        }}
      />

      {/* Global GS1 Pallet Label Preview & Print Modal */}
      <PalletLabelModal
        isOpen={isPalletLabelOpen}
        onClose={() => setIsPalletLabelOpen(false)}
        pallet={activeLabelPallet}
      />

      {/* Global Inter-Unit Stock Transfer Modal */}
      <CreateStockTransferModal
        isOpen={isStockTransferOpen}
        onClose={() => {
          setIsStockTransferOpen(false);
          setStockTransferPrefill(null);
        }}
        initialData={stockTransferPrefill}
        onOpenBarcodeScanner={() => {
          setIsStockTransferOpen(false);
          setIsBarcodeScannerOpen(true);
        }}
      />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('StockAI React ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          width: '100vw',
          background: '#0F172A',
          color: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: '#1E293B',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '32px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={28} color="#EF4444" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC', marginBottom: '6px' }}>
                StockAI Workspace Reload Required
              </h2>
              <p style={{ fontSize: '12.5px', color: '#94A3B8', lineHeight: '1.5' }}>
                {this.state.error?.message || 'An unexpected client view error occurred while rendering the workspace.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px' }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '12px' }}
              >
                Clear Cache & Sign In
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ErrorBoundary>
  );
}
