import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css'
import { useEffect } from 'react';

import BaseInformation from './BaseInfomation';
import { casdoorConfig } from './casdoorConfig';
import Callback from './Callback';

function App() {
  const { loginUrl } = casdoorConfig;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/login') {
      window.location.replace(loginUrl);
    }

    if (location.pathname === '/callback') {
      return;
    }

    const accessToken = localStorage.getItem('refresh_token');

    if (!accessToken) {
      navigate('/login');
    }

  }, [loginUrl, navigate, location.pathname]);

  return (
      <Routes>
        <Route path='/' element={<BaseInformation/ >} />
        <Route path='callback' element={<Callback />} />
        <Route path='login' element={<>正在重定向到登录页面...</>} />
      </Routes>
  )
}

export default App
