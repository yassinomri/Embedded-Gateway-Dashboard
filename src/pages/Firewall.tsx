import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { FirewallConfig, Rule} from '@/types/firewall';
import { useToast } from '../hooks/use-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Firewall.css';
import { usePersistedState } from '../hooks/usePersistedState';
import { getFirewall, updateFirewall } from '@/lib/firewall-api';

// Debounce utility function
const debounce = <F extends (...args: unknown[]) => Promise<unknown>>(
  func: F,
  waitFor: number
) => {
  let timeout: NodeJS.Timeout;
  let pendingPromise: Promise<unknown> | null = null;

  return (...args: Parameters<F>): ReturnType<F> => {
    if (timeout) {
      clearTimeout(timeout);
    }
    if (pendingPromise) {
      pendingPromise.catch(() => {}); // Clean up previous promise
    }

    return new Promise((resolve, reject) => {
      timeout = setTimeout(() => {
        pendingPromise = func(...args)
          .then(resolve)
          .catch(reject)
          .finally(() => {
            pendingPromise = null;
          });
      }, waitFor);
    }) as ReturnType<F>;
  };
};


const Firewall: React.FC = () => {
  const [config, setConfig] = usePersistedState<FirewallConfig>('firewallConfig', { enabled: true, rules: [] });
  const [loading, setLoading] = usePersistedState<boolean>('firewallLoading', true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatePending, setUpdatePending] = useState(false);
  const [newRule, setNewRule] = useState<Partial<Rule>>({
    name: '',
    src: 'any',
    dest: 'any',
    proto: 'tcp',
    target: 'ACCEPT',
    enabled: true,
  });
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clean up session storage if needed
      sessionStorage.removeItem('firewallConfig');
      sessionStorage.removeItem('firewallLoading');
    };
  
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const initialRuleState = useMemo(() => ({
    name: '',
    src: 'any',
    dest: 'any',
    proto: 'tcp',
    target: 'ACCEPT',
    enabled: true,
  }), []);

  // Memoized config rules for performance
  const rules = useMemo(() => config.rules, [config.rules]);

  // Debounced API calls
  const debouncedUpdateFirewall = useMemo(
    () => debounce(updateFirewall, 300),
    []
  );

  // Fetch firewall config with error handling
  const fetchConfig = useCallback(async (showToast = true) => {
    try {
      const response = await getFirewall();
      setConfig(response);
      sessionStorage.setItem('firewallConfig', JSON.stringify(response));
    } catch (error) {
      if (showToast) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch firewall rules',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast, setConfig, setLoading]); 

  useEffect(() => {
    // Check if we have cached data
    const cachedConfig = sessionStorage.getItem('firewallConfig');
    if (cachedConfig) {
      setConfig(JSON.parse(cachedConfig));
      setLoading(false);
    }
    fetchConfig(false);
  }, [fetchConfig, setConfig, location.key, setLoading]);

  // Fetch on mount
  useEffect(() => {
    fetchConfig(false);
    
    const intervalId = setInterval(() => {
      getFirewall(true).then(setConfig).catch(() => {});
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [fetchConfig, setConfig]);

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setNewRule(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }, []);

  // Handle adding a new rule with optimistic updates
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Rule name is required',
      });
      return;
    }

    setUpdatePending(true);
    const rule: Rule = {
      id: `temp-${Date.now()}`,
      name: newRule.name,
      src: newRule.src || 'any',
      dest: newRule.dest || 'any',
      proto: newRule.proto || 'tcp',
      target: newRule.target || 'ACCEPT',
      enabled: newRule.enabled ?? true,
    };

    // Optimistic update
    const previousConfig = config;
    setConfig(current => ({
      ...current,
      rules: [...current.rules, rule]
    }));

    try {
      await debouncedUpdateFirewall({ action: 'add', enabled: config.enabled, rules: [rule] });
      toast({
        title: 'Success',
        description: 'Rule added successfully',
      });
      setIsModalOpen(false);
      setNewRule(initialRuleState);
    } catch (error) {
      // Revert on error
      setConfig(previousConfig);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add rule',
      });
    } finally {
      setUpdatePending(false);
    }
  };

  // Handle deleting a rule with optimistic updates
  const handleDeleteRule = async (id: string) => {
    setUpdatePending(true);
    // Optimistic update
    const previousConfig = config;
    setConfig(current => ({
      ...current,
      rules: current.rules.filter(rule => rule.id !== id)
    }));

    try {
      await debouncedUpdateFirewall({ action: 'delete', id });
      toast({
        title: 'Success',
        description: 'Rule deleted successfully',
      });
    } catch (error) {
      // Revert on error
      setConfig(previousConfig);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete rule',
      });
    } finally {
      setUpdatePending(false);
    }
  };

  // Debounced toggle handler
  const debouncedToggleHandler = useMemo(() => 
    debounce(async (newEnabled: boolean) => {
      await updateFirewall({ action: 'update', enabled: newEnabled });
      toast({
        title: 'Success',
        description: `Firewall ${newEnabled ? 'enabled' : 'disabled'} successfully`,
      });
    }, 300),
  [toast]);

 // Handle toggling firewall with debouncing
const handleToggleFirewall = async () => {
  const newEnabled = !config.enabled;
  setUpdatePending(true);
  
  // Capture current config for potential rollback
  const previousConfig = config;
  
  // Optimistic update to both state and cache
  const newConfig = { ...config, enabled: newEnabled };
  setConfig(newConfig);
  sessionStorage.setItem('firewallConfig', JSON.stringify(newConfig));
  
  try {
    await debouncedToggleHandler(newEnabled);
    toast({
      title: 'Success',
      description: `Firewall ${newEnabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    // Revert on error
    setConfig(previousConfig);
    sessionStorage.setItem('firewallConfig', JSON.stringify(previousConfig));
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Failed to toggle firewall state',
    });
  } finally {
    setUpdatePending(false);
  }
};

// (Duplicate declaration removed)

  // Memoized target class getter
  const getTargetClass = useCallback((target: string) => {
    return `target-${target}`;
  }, []);

  if (loading) {
    return (
      <div className="firewall-loading">
        <div className="loading-spinner"></div>
        Loading Firewall Rules...
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>
          <Shield size={28} color="#00f6ff" />
          Firewall Rules
        </h1>
      </header>
  
      <div className="firewall-header">
      <div className={`firewall-status ${config.enabled ? 'firewall-active' : 'firewall-inactive'}`}>
        <div className="status-indicator">
          <span className={`status-dot ${config.enabled ? 'active' : 'inactive'}`}></span>
          <span className="status-text">
            Firewall {config.enabled ? 'Active' : 'Inactive'}
          </span>
        </div>
        <label className="firewall-toggle">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={handleToggleFirewall}
            disabled={updatePending}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

        <label className="total-rules-label">
          Total Rules: <span className="total-rules-count">{}</span>
        </label>
        <button
          onClick={() => setIsModalOpen(true)}
          className="primary-button add-rule-button"
          disabled={updatePending}
        >
          <Plus size={20} /> Add Rule
        </button>
      </div>
  
      {rules.length === 0 ? (
        <div className="no-rules">
          <AlertTriangle size={32} color="#00f6ff" />
          <p>No firewall rules have been defined yet. Click "Add Rule" to create your first rule.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Protocol</th>
                <th>Action</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.name}</td>
                  <td>{rule.src}</td>
                  <td>{rule.dest}</td>
                  <td>{rule.proto}</td>
                  <td className={`target-column ${getTargetClass(rule.target)}`}>{rule.target}</td>
                  <td>
                    <div className="status-icon">
                      <Shield
                        color={rule.enabled ? '#00f6ff' : '#ff0000'}
                        size={20}
                      />
                      <span className="status-label">
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="actions-column">
                      <button
                        className="action-icon delete-icon"
                        onClick={() => !updatePending && handleDeleteRule(rule.id)}
                        disabled={updatePending}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
  
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <header className="modal-header">
              <h2>
                <Plus size={24} color="#00f6ff" />
                Add New Rule
              </h2>
              <button 
                type="button" 
                className="modal-close-button" 
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <form onSubmit={handleAddRule} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">Rule Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={newRule.name}
                    onChange={handleInputChange}
                    placeholder="Enter rule name"
                    required
                    className="enhanced-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="src">Source</label>
                  <select 
                    id="src" 
                    name="src" 
                    value={newRule.src} 
                    onChange={handleInputChange}
                    className="enhanced-select"
                  >
                    <option value="any">Any</option>
                    <option value="lan">LAN</option>
                    <option value="wan">WAN</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="dest">Destination</label>
                  <select 
                    id="dest" 
                    name="dest" 
                    value={newRule.dest} 
                    onChange={handleInputChange}
                    className="enhanced-select"
                  >
                    <option value="any">Any</option>
                    <option value="lan">LAN</option>
                    <option value="wan">WAN</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="proto">Protocol</label>
                  <select 
                    id="proto" 
                    name="proto" 
                    value={newRule.proto} 
                    onChange={handleInputChange}
                    className="enhanced-select"
                  >
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                    <option value="all">All</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="target">Action</label>
                  <select 
                    id="target" 
                    name="target" 
                    value={newRule.target} 
                    onChange={handleInputChange}
                    className="enhanced-select"
                  >
                    <option value="ACCEPT">Accept</option>
                    <option value="DROP">Drop</option>
                    <option value="REJECT">Reject</option>
                  </select>
                </div>
                
                <div className="form-group checkbox-container">
                  <div className="enhanced-checkbox-group">
                    <input
                      type="checkbox"
                      id="enabled"
                      name="enabled"
                      checked={newRule.enabled ?? true}
                      onChange={handleInputChange}
                      className="enhanced-checkbox"
                    />
                    <label htmlFor="enabled" className="checkbox-label">Enabled</label>
                  </div>
                </div>
              </div>
              
              <footer className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="secondary-button"
                  disabled={updatePending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={updatePending}
                >
                  {updatePending ? 'Adding...' : 'Add Rule'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Firewall;
