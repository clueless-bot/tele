import React, { useEffect, useState } from 'react'
import { useAuthContext } from '../context/AuthContext'
import { Navigate } from 'react-router-dom';

const ProtectedRoutes = ({ children }) => {

    const { currentUser, handleSetUser } = useAuthContext();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const storedAuth = localStorage.getItem('telestudio_user');
      if (storedAuth) {
        handleSetUser(JSON.parse(storedAuth));
      }
      setLoading(false);  
    }, []);

  if(loading) return "loading...."

  return (
    currentUser?.name ? children : <Navigate to={"/"}/>
  )
}

export default ProtectedRoutes