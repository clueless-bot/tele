import { createContext, useEffect, useState } from "react";
import { useContext } from "react";
import { useLocation } from "react-router-dom";


const SidebarContext = createContext();

export const useSidebarContext = () => {
    return useContext(SidebarContext)
}

const SidebarProvider = ({ children }) => {
    const [currentTab, setCurrentTab] = useState('dashboard');

    const location = useLocation();

    const handleSetTab = (tab) => setCurrentTab(tab);


    let value = {
        currentTab,
        setCurrentTab,
        handleSetTab
    }

    useEffect(() => {
        const path = location.pathname;
        const match = path.match(/[^/]+$/);
        if(match){
            handleSetTab(match[0])
        }
    }, [])

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    )
}


export default SidebarProvider
