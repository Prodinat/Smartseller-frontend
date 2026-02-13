import React from 'react';
import './Card.css';

interface CardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', style }) => {
    return (
        <div className={`card ${className}`} style={style}>
            {title && <h3 className="card-title">{title}</h3>}
            <div className="card-content">{children}</div>
        </div>
    );
};

export default Card;
