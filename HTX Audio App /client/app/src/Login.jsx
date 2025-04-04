import { React, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
  const [values, setValues] = useState({
    username: "",
    password: "",
  });
  const navigate = useNavigate();
  axios.defaults.withCredentials = true;
  const handleSubmit = (event) => {
    event.preventDefault();
    // Call the server side to register the user
    axios
      .post("http://localhost:3000/login", values)
      .then((res) => {
        if (res.data.message === "User logged in successfully") {
          window.alert("User has logged in successfully");
          navigate("/media");
        }
      })
      .catch((err) => {
        if (err.response.data.message === "User does not exist") {
          window.alert("User does not exist");
        } else if (err.response.data.message === "Invalid password") {
          window.alert("Invalid password");
        } else if (
          err.response.data.message === "Please provide all user details"
        ) {
          window.alert("Please provide all user details");
        } else {
          window.alert("Internal server error");
        }
      });
  };
  return (
    <div className="d-flex justify-content-center align-items-center bg-primary vh-100 vw-100">
      <div className="bg-white rounded w-25 w-md-85 w-lg-100 p-4">
        <h2 className="text-start mb-3">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="username">
              <strong>Username</strong>
            </label>
            <input
              type="text"
              placeholder="Enter Username"
              name="username"
              onChange={(e) =>
                setValues({ ...values, username: e.target.value })
              }
              className="form-control rounded-0"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password">
              <strong>Password</strong>
            </label>
            <input
              type="password"
              placeholder="Enter Password"
              name="password"
              onChange={(e) =>
                setValues({ ...values, password: e.target.value })
              }
              className="form-control rounded-0"
            />
          </div>
          <button
            type="submit"
            className="btn btn-success w-100 rounded-0 mb-2"
          >
            Login
          </button>
        </form>
        <Link
          to="/register"
          className="btn btn-default border w-100 bg-light rounded-0 text-decoration-none"
          style={{ color: "inherit" }}
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}

export default Login;
