import React, { useState, useEffect } from 'react';
import { Shield, Trash2, Plus } from 'lucide-react';
import { getFirewall, updateFirewall, FirewallConfig, Rule } from '../lib/firewall-api';
import { useToast } from '../hooks/use-toast';
import '../styles/Firewall.css';

const Firewall: React.FC = () => {
  const [config, setConfig] = useState<FirewallConfig>({ enabled: true, rules: [] });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRule, setNewRule] = useState<Partial<Rule>>({
    name: '',
    src: 'any',
    dest: 'any',
    proto: 'tcp',
    target: 'ACCEPT',
    enabled: true,
  });
  const { toast } = useToast();

  // Fetch firewall config
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await getFirewall();
      console.log('getFirewall Response:', response);
      setConfig(response);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching firewall config:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch firewall rules',
      });
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  // Handle input changes in the form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setNewRule((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Handle adding a new rule
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

    const rule: Rule = {
      id: `temp-${Date.now()}`,
      name: newRule.name,
      src: newRule.src || 'any',
      dest: newRule.dest || 'any',
      proto: newRule.proto || 'tcp',
      target: newRule.target || 'ACCEPT',
      enabled: newRule.enabled ?? true,
    };

    try {
      await updateFirewall({ action: 'add', enabled: config.enabled, rules: [rule] });
      toast({
        title: 'Success',
        description: 'Rule added successfully',
      });
      setIsModalOpen(false);
      setNewRule({ name: '', src: 'any', dest: 'any', proto: 'tcp', target: 'ACCEPT', enabled: true });
      await fetchConfig();
    } catch (error) {
      console.error('Error adding rule:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add rule',
      });
    }
  };

  // Handle deleting a rule
  const handleDeleteRule = async (id: string) => {
    try {
      await updateFirewall({ action: 'delete', id });
      toast({
        title: 'Success',
        description: 'Rule deleted successfully',
      });
      await fetchConfig();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete rule',
      });
    }
  };

  if (loading) {
    return <div className="firewall-loading">Loading...</div>;
  }

  return (
    <div className="firewall-container">
      <h1 className="firewall-title">Firewall Rules</h1>
      <button
        onClick={() => setIsModalOpen(true)}
        className="add-rule-button"
      >
        <Plus size={20} /> Add Rule
      </button>

      {config.rules.length === 0 ? (
        <p className="no-rules">No rules available</p>
      ) : (
        <table className="firewall-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Source</th>
              <th>Destination</th>
              <th>Protocol</th>
              <th>Action</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {config.rules.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.name}</td>
                <td>{rule.src}</td>
                <td>{rule.dest}</td>
                <td>{rule.proto}</td>
                <td>{rule.target}</td>
                <td>
                  <Shield
                    color={rule.enabled ? '#00f6ff' : '#ff0000'}
                    size={20}
                  />
                </td>
                <td>
                  <Trash2
                    className="delete-icon"
                    size={20}
                    onClick={() => handleDeleteRule(rule.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add Rule Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New Rule</h2>
            <form onSubmit={handleAddRule}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newRule.name}
                  onChange={handleInputChange}
                  placeholder="Enter rule name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="src">Source</label>
                <select id="src" name="src" value={newRule.src} onChange={handleInputChange}>
                  <option value="any">Any</option>
                  <option value="lan">LAN</option>
                  <option value="wan">WAN</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="dest">Destination</label>
                <select id="dest" name="dest" value={newRule.dest} onChange={handleInputChange}>
                  <option value="any">Any</option>
                  <option value="lan">LAN</option>
                  <option value="wan">WAN</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="proto">Protocol</label>
                <select id="proto" name="proto" value={newRule.proto} onChange={handleInputChange}>
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="target">Action</label>
                <select id="target" name="target" value={newRule.target} onChange={handleInputChange}>
                  <option value="ACCEPT">Accept</option>
                  <option value="DROP">Drop</option>
                  <option value="REJECT">Reject</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="enabled">
                  <input
                    type="checkbox"
                    id="enabled"
                    name="enabled"
                    checked={newRule.enabled}
                    onChange={handleInputChange}
                  />
                  Enabled
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit">Add Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Firewall;