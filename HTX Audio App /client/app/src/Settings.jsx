import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Button from "react-bootstrap/Button";

function Settings() {
  const [auth, setAuth] = useState(false);
  const [name, setName] = useState(""); // Contains cookies name
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState(""); // Contains cookies username
  const [tabKey, setTabKey] = useState("update");
  const [values, setValues] = useState({
    name: "",
    username: "",
    password: "",
    cookiesName: "",
    cookiesUsername: "",
  });

  // Get cookie values
  axios.defaults.withCredentials = true;

  useEffect(() => {
    axios
      .get("http://localhost:3000")
      .then((res) => {
        if (res.data.status === "Success") {
          setAuth(true);
          setName(res.data.name);
          setUsername(res.data.username);
          setValues({
            ...values,
            cookiesName: res.data.name,
            cookiesUsername: res.data.username,
          });
        } else {
          setAuth(false);
          setMessage(res.data.Error);
        }
      })
      .then((err) => console.log(err));
  }, []);

  const handleLogout = () => {
    axios
      .get("http://localhost:3000/logout")
      .then((res) => {
        location.reload(true);
      })
      .catch((err) => console.log(err));
  };

  const handleUpdate = (event) => {
    event.preventDefault();
    axios
      .post("http://localhost:3000/update", values)
      .then((res) => {
        if (
          res.data.message === "User details have been successfully updated"
        ) {
          window.alert("User details have been successfully updated");
          window.location.reload();
        }
      })
      .catch((err) => {
        if (
          err.response.data.message === "Please provide user details to update"
        ) {
          window.alert("Please provide user details to update");
        } else if (
          err.response.data.message ===
          "This username is taken. Please choose another username"
        ) {
          window.alert(
            "This username is taken. Please choose another username"
          );
        }
      });
  };

  const handleDelete = (event) => {
    event.preventDefault();
    axios.get("http://localhost:3000").then((res) => {
      if (res.data.status === "Success") {
        const usernameToDelete = res.data.username;
        axios
          .post("http://localhost:3000/deleteAccount", { usernameToDelete })
          .then((res) => {
            if (res.data.message === "User account has been deleted") {
              window.alert("User account has been deleted");
              window.location.reload();
            }
          })
          .catch((err) => {
            window.alert("Error with deleting user account");
          });
      } else {
        window.alert("Error locating account");
      }
    });
  };

  return auth ? (
    <div>
      <Navbar bg="dark" data-bs-theme="dark">
        <Container>
          <Navbar.Brand href="/media">HTX Audio Portal</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/media">
              Media
            </Nav.Link>
            <Nav.Link as={Link} to="/settings">
              Settings
            </Nav.Link>
          </Nav>
          <Navbar.Collapse className="justify-content-end">
            <Navbar.Text className="me-5">
              Signed in as: <Link to="/settings">{username}</Link>
            </Navbar.Text>
            <Button variant="outline-danger" onClick={handleLogout}>
              Logout
            </Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <div className="d-flex justify-content-center align-items-center vh-100 vw-100">
        <div className="bg-white rounded w-50 w-md-85 w-lg-100 p-4 border border-gray-300">
          <h2 className="text-start mb-3">Account Settings</h2>
          <Tabs
            activeKey={tabKey}
            onSelect={(k) => setTabKey(k)}
            className="mb-3"
          >
            <Tab
              eventKey="update"
              title="Update Account"
              style={{ minHeight: "280px" }}
            >
              <form onSubmit={handleUpdate}>
                <div className="mb-3">
                  <label htmlFor="name">
                    <strong>New Name</strong>
                  </label>
                  <input
                    type="text"
                    placeholder={`Current Name: ${name}`}
                    name="name"
                    onChange={(e) =>
                      setValues({ ...values, name: e.target.value })
                    }
                    className="form-control rounded-0"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="username">
                    <strong>New Username</strong>
                  </label>
                  <input
                    type="text"
                    placeholder={`Current Username: ${username}`}
                    name="username"
                    onChange={(e) =>
                      setValues({ ...values, username: e.target.value })
                    }
                    className="form-control rounded-0"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password">
                    <strong>New Password</strong>
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
                  Update
                </button>
              </form>
            </Tab>
            <Tab
              eventKey="delete"
              title="Delete Account"
              style={{ minHeight: "280px" }}
            >
              <form onSubmit={handleDelete}>
                <div className="mb-3">
                  <label
                    className="align-text-center"
                    style={{ marginTop: "80px" }}
                  >
                    <center>
                      <strong>
                        I consent to deleting my account and acknowledge that
                        this action cannot be reversed
                      </strong>
                    </center>
                  </label>
                </div>
                <button
                  type="submit"
                  className="btn btn-danger w-100 rounded-0 mb-2"
                >
                  Delete Account
                </button>
              </form>
            </Tab>
          </Tabs>
        </div>
      </div>
    </div>
  ) : (
    <div className="d-flex justify-content-center align-items-center bg-danger vh-100 vw-100">
      <div className="bg-white rounded w-25 w-md-85 w-lg-100 p-4">
        <h2 className="text-center mb-3">{message}</h2>
        <h4 className="text-center mb-3">Login Now</h4>
        <Link to="/login" className="btn btn-success w-100 rounded-0 mb-2">
          Login
        </Link>
      </div>
    </div>
  );
}

export default Settings;
