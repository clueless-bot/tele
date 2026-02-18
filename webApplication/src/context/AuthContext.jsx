import { createContext, useContext, useEffect, useState } from "react";


const AuthContext = createContext();

export const useAuthContext = () => {
    return useContext(AuthContext)
}

const AuthProvider = ({ children }) => {

    const [currentUser, setCurrentUser] = useState(null);
    const [isSetting, setIsSetting] = useState(false);

    const handleSetUser = (user) => {
        localStorage.setItem("telestudio_user", JSON.stringify(user));
        setCurrentUser(user);
    }

    const logout = () => {
        localStorage.removeItem("telestudio_user");
        setCurrentUser(null)
    }

    let value = {
        currentUser,
        setCurrentUser,
        handleSetUser,
        logout
    }

    useEffect(() => {
        setIsSetting(true)
        const user = JSON.parse(localStorage.getItem("telestudio_user"));
        setCurrentUser(user)
        setIsSetting(false)
    }, [])

    return (
        <AuthContext.Provider value={value}>
            {!isSetting && children}
        </AuthContext.Provider>
    )
}

export default AuthProvider;