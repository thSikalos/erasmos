import React from 'react';
import '../App.css';

const StatCard = ({ title, value, icon }) => {
    return (
        <div className="stat-card">
            <div className="stat-card-info">
                <h4>{title}</h4>
                <p>{value}</p>
            </div>
        </div>
    );
};

export default StatCard;