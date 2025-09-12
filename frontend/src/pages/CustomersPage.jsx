import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const CustomersPage = () => {
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchCustomers = async () => {
            if (!token) return;
            try {
                const config = { 
                    headers: { Authorization: `Bearer ${token}` },
                    params: { search: searchTerm }
                };
                const res = await axios.get('http://localhost:3000/api/customers', config);
                setCustomers(res.data);
            } catch (err) {
                console.error('Failed to fetch customers', err);
            } finally {
                setLoading(false);
            }
        };
        
        const delayDebounceFn = setTimeout(() => { fetchCustomers(); }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [token, searchTerm]);

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Πελατολόγιο</h1>
                <Link to="/application/new" className="button-new">Νέα Αίτηση</Link>
            </header>
            <main>
                <div className="form-group">
                    <input 
                        type="text"
                        placeholder="Αναζήτηση με Όνομα ή ΑΦΜ..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {loading ? <p>Loading...</p> : (
                    <table className="applications-table">
                        <thead>
                            <tr><th>Όνομα</th><th>ΑΦΜ</th><th>Τηλέφωνο</th><th>Συνεργάτης</th></tr>
                        </thead>
                        <tbody>
                            {customers.map(c => (
                                <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)} style={{cursor: 'pointer'}}>
                                    <td>{c.full_name}</td>
                                    <td>{c.afm}</td>
                                    <td>{c.phone}</td>
                                    <td>{c.associate_name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </main>
        </div>
    );
};

export default CustomersPage;