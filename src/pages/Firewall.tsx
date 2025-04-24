import React, { useState, useEffect } from 'react';
import { Shield, Trash2 } from 'lucide-react';
import { getFirewall, updateFirewall, FirewallConfig, Rule } from '../lib/firewall-api';
import { useToast } from '../hooks/use-toast';
import '../styles/Firewall.css';

const Firewall: React.FC = () => {
  const [config, setConfig] = useState<FirewallConfig>({ enabled: true, rules: [] });
  const [loading, setLoading] = useState(true);
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

  // Handle adding a new rule
  const handleAddRule = async () => {
    const newRule: Rule = {
      id: `temp-${Date.now()}`,
      name: `NewRule-${config.rules.length + 1}`,
      src: 'any',
      dest: 'any',
      proto: 'tcp',
      target: 'ACCEPT',
      enabled: true,
    };

    try {
      await updateFirewall({ action: 'add', enabled: config.enabled, rules: [newRule] });
      toast({
        title: 'Success',
        description: 'Rule added successfully',
      });
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
    return <div>Loading...</div>;
  }

  return (
    <div className="firewall-container">
      <h1>Firewall Rules</h1>
      <button onClick={handleAddRule} className="add-rule-button">
        Add Rule
      </button>
      {config.rules.length === 0 ? (
        <p>No rules available</p>
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
    </div>
  );
};

export default Firewall;