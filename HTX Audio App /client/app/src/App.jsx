//import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Register from './Register'
import Login from './Login'
import Settings from './Settings'
import Media from './Media'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element= {<Login />}></Route>
        <Route path="/register" element= {<Register />}></Route>
        <Route path="/login" element= {<Login />}></Route>
        <Route path="/settings" element ={<Settings />}></Route>
        <Route path="/media" element ={<Media />}></Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
