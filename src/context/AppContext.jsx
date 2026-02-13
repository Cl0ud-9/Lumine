import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
    const [currentStep, setStep] = useState('intro');
    const [token, setToken] = useState(null);

    // In a real app, these would come from the backend based on the token
    // For now, we'll use defaults or demo data
    const [boyfriendName] = useState('Your Secret Admirer');
    const [girlfriendName] = useState('My Valentine');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tokenParam = params.get('token');
        if (tokenParam) {
            setToken(tokenParam);
        }
    }, []);

    return (
        <AppContext.Provider value={{
            currentStep,
            setStep,
            token,
            boyfriendName,
            girlfriendName
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
