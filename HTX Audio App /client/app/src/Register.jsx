import { useState, React } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function Register() {
  const [values, setValues] = useState({
    name: "",
    username: "",
    password: "",
  });

  const navigate = useNavigate();
  const handleSubmit = (event) => {
    console.log("submitted in register");
    event.preventDefault();
    // Call the server side to register the user
    axios
      .post("http://localhost:3000/register", values)
      .then((res) => {
        console.log("reading the res after post");
        console.log(res.data);
        if (res.data.message === "User registered successfully") {
          window.alert("User has been registered successfully");
          navigate("/login");
        }
      })
      .catch((err) => {
        if (err.response.data.message === "Please provide all user details") {
          window.alert("Please provide all the user details");
        } else if (
          err.response.data.message === "User with this username already exists"
        ) {
          window.alert("User with this username already exists");
        } else if (err.response.data.message === "Internal server error") {
          window.alert("Internal server error");
        } else {
          window.alert("Not registered successfully");
        }
      });
  };

  return (
    <div className="d-flex justify-content-center align-items-center bg-primary vh-100 vw-100">
      <div className="bg-white rounded w-25 w-md-85 w-lg-100 p-4">
        <h2 className="text-start mb-3">Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="name">
              <strong>Name</strong>
            </label>
            <input
              type="text"
              placeholder="Enter Name"
              name="name"
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              className="form-control rounded-0"
            />
          </div>

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
            Sign up
          </button>
        </form>
        <Link
          to="/login"
          className="btn btn-default border w-100 bg-light rounded-0 text-decoration-none"
          style={{ color: "inherit" }}
        >
          Login
        </Link>
      </div>
    </div>
  );
}

export default Register;
