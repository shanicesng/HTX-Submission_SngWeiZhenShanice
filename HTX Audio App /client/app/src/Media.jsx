import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { Buffer } from "buffer";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import Container from "react-bootstrap/Container";

function Media() {
  // Cookies related hooks
  const [auth, setAuth] = useState(false);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState(""); // Contains cookies username
  const [uploadHistory, setUploadHistory] = useState([]); // Contains user's history of uploads
  // Get cookie values
  axios.defaults.withCredentials = true;

  const handleLogout = () => {
    axios
      .get("http://localhost:3000/logout")
      .then((res) => {
        location.reload(true);
      })
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    axios
      .get("http://localhost:3000")
      .then((res) => {
        if (res.data.status === "Success") {
          setAuth(true);
          setUsername(res.data.username);
          axios
            .post("http://localhost:3000/getUploads", {
              username: res.data.username,
            })
            .then((res) => {
              if (res.data.message === "No history of audio uploads") {
                setUploadHistory([]);
              } else if (
                res.data.message === "Previous history of audio uploads"
              ) {
                setUploadHistory(res.data.uploads);
              }
            })
            .catch((err) => console.log(err));
        } else {
          setAuth(false);
        }
      })
      .catch((err) => console.log(err));
  }, []);

  const handleDelete = (button_value) => {
    const filename = button_value.split("/").pop();
    // Call backend API to delete file from AWS and Postgres database
    axios
      .post("http://localhost:3000/deleteAudio", { filename: filename })
      .then((res) => {
        if (res.data.message === "File has been deleted") {
          window.alert("File has been deleted");
          window.location.reload();
        }
      })
      .catch((err) => {
        console.log("Error deleting file");
        console.log(err);
      });
  };

  const [fileUploadProgress, setFileUploadProgress] = useState(undefined); // No file is being uploaded, set to null when nothing is being uploaded
  const [result, setResult] = useState("");
  const [newURL, setNewURL] = useState("");
  const supportedExtensions = [
    "m4a",
    "flac",
    "mp3",
    "mp4",
    "wav",
    "wma",
    "aac",
  ];

  // Track audio file input from user
  const [audioCategory, setAudioCategory] = useState("");
  const [audioDescription, setAudioDescription] = useState("");
  const [fileInput, setFileInput] = useState("");
  const [fileName, setFileName] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!audioCategory || !audioDescription || !fileInput) {
      window.alert("Please fill in all input fields");
    } else if (fileInput) {
      if (!checkValidFileExtension(fileInput)) {
        window.alert(
          "Invalid file type. Please provide an audio file of type .m4a, .flac, .mp3, .mp4, .wav, .wma, .aac"
        );
      } else {
        const values = {
          username: username,
          fileName: fileName,
          category: audioCategory,
          description: audioDescription,
          s3URL: newURL,
        };
        axios
          .post("http://localhost:3000/uploadFile", values)
          .then((res) => {
            if (
              res.data.message ===
              "Audio information has been saved successfully"
            ) {
              window.alert("Audio information has been saved successfully");
              // Reload the page and clear data
              window.location.reload();
            }
          })
          .catch((err) => {
            console.log(err);
            window.alert("Error with saving audio information");
          });
      }
    }
  };
  const checkValidFileExtension = (fileName) => {
    const fileExtension = fileName.split(".").pop();
    if (!supportedExtensions.includes(fileExtension)) {
      return false;
    }
    return true;
  };

  const getFileName = (filePath) => {
    const fileWithExtension = filePath.split("\\").pop();
    // Find the last dot in the file name to separate the name from the extension
    const lastDotIndex = fileWithExtension.lastIndexOf(".");
    const fileName = fileWithExtension.substring(0, lastDotIndex);
    const fileExtension = fileWithExtension.substring(lastDotIndex + 1);
    return `${fileName}.${fileExtension}`;
  };

  // AWS information here
  const s3 = new S3Client({
    region: import.meta.env.VITE_AWS_REGION,
    credentials: {
      accessKeyId: import.meta.env.VITE_AWSAccessKeyId,
      secretAccessKey: import.meta.env.VITE_AWSSecretAccessKey,
    },
  });

  // AWS Methods

  // Splitting one file into multiple parts, ensure that these parts are linked by a key
  const createMultiPartUpload = async (key) => {
    const multipartUpload = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: import.meta.env.VITE_AWS_BUCKET,
        Key: key,
      })
    );
    return multipartUpload;
  };

  // Upload individual parts of the file to S3
  const uploadPartS3 = async (key, uploadId, filePart, iteration) => {
    const res = await s3.send(
      new UploadPartCommand({
        Bucket: import.meta.env.VITE_AWS_BUCKET,
        Key: key,
        UploadId: uploadId,
        Body: filePart,
        PartNumber: iteration + 1,
      })
    );
    return res;
  };

  // Notify AWS that all parts of file have been uploaded
  const completeMultiPartUpload = async (key, uploadId, uploadResults) => {
    const res = await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: import.meta.env.VITE_AWS_BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: uploadResults.map(({ ETag }, i) => {
            return {
              ETag,
              PartNumber: i + 1,
            };
          }),
        },
      })
    );
    return res;
  };

  // Stop command when it is unsuccessful
  const abortMultiPartUpload = async (key, uploadId) => {
    const abortCommand = new AbortMultipartUploadCommand({
      Bucket: import.meta.env.VITE_AWS_BUCKET,
      Key: key,
      UploadId: uploadId,
    });
    await s3.send(abortCommand);
  };

  const handleUploadFile = async (file) => {
    setFileUploadProgress(null);
    const randomString = nanoid(10); // Generates a random string of 10 chars as AWS identifier
    const fileExtension = file.name.split(".").pop(); // Get the file extension so the user can download a file of the same extension
    const key = `${randomString}.${fileExtension}`;
    const multipartUpload = await createMultiPartUpload(key);
    const uploadId = multipartUpload.UploadId;
    const uploadPromises = [];
    const partSize = 10 * 1024 * 1024; // Each file part is at least 10MB in size
    const totalParts = Math.ceil(file.size / partSize); // Total parts that file will be split into
    try {
      let partCount = 0;
      const executeAndPrint = async (buffer, iteration, runCount = 0) => {
        try {
          const res = await uploadPartS3(key, uploadId, buffer, iteration);
          setFileUploadProgress(
            (((iteration + 1) / totalParts) * 100).toFixed(2)
          );
          return res;
        } catch (error) {
          if (runCount > 5) {
            console.error("Item", iteration, "completely failed to upload");
            return;
          }
          console.warn(error);
          const res = await executeAndPrint(buffer, iteration, runCount + 1);
          return res;
        }
      };
      do {
        // Start uploading file
        const start = partCount * partSize;
        const end = start + partSize;
        const filePart = file.slice(start, end);
        if (filePart.size < 1) {
          break; // Nothing left to upload
        }
        const arrayBuffer = await filePart.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const res = await executeAndPrint(buffer, partCount);
        uploadPromises.push(res);
        partCount++;
      } while (true);
      const res = completeMultiPartUpload(key, uploadId, uploadPromises)
        .then((res) => {
          setResult(res);
          setNewURL(
            `https://${import.meta.env.VITE_AWS_BUCKET}.s3.amazonaws.com/${key}`
          );
        })
        .catch((error) => {
          window.alert("Error with completing video upload");
          console.log(error);
        });
      return res;
    } catch (error) {
      console.log("Error with uploading file");
      console.log(error);
      if (uploadId) {
        await abortMultiPartUpload(key, uploadId);
      }
    }
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
      <div
        className="d-flex flex-column vh-100 vw-100"
        style={{ padding: "50px" }}
      >
        <Form
          style={{ marginTop: "30px", width: "100%" }}
          onSubmit={handleSubmit}
        >
          <Card>
            <Card.Header>Upload Audio File</Card.Header>
            <Card.Body>
              <Card.Text style={{ marginBottom: "30px" }}>
                Please fill in all input fields below
              </Card.Text>
              <Row style={{ marginBottom: "10px" }}>
                <Col md={2}>
                  <Form.Label>Audio Category</Form.Label>
                  <Form.Select
                    defaultValue=""
                    onChange={(e) => setAudioCategory(e.target.value)}
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    <option value="A">Category A</option>
                    <option value="B">Category B</option>
                    <option value="C">Category C</option>
                    <option value="D">Category D</option>
                  </Form.Select>
                </Col>
                <Col md={5}>
                  <Form.Label>Audio Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    onChange={(e) => setAudioDescription(e.target.value)}
                    placeholder="Enter a description of audio file here"
                  />
                </Col>
                <Col md={4}>
                  <Form.Label>File Input</Form.Label>
                  <Form.Control
                    type="file"
                    onChange={(e) => {
                      setFileInput(e.target.value);
                      if (checkValidFileExtension(e.target.value)) {
                        setFileName(getFileName(e.target.value));
                        handleUploadFile(e.target.files[0]);
                      } else {
                        window.alert(
                          "Invalid audio type. Please provide an audio file of type .m4a, .flac, .mp3, .mp4, .wav, .wma, .aac"
                        );
                      }
                    }}
                  />
                  {fileUploadProgress !== undefined && (
                    <p className="mt-2">
                      File Upload Progress:{" "}
                      {fileUploadProgress === null
                        ? "Starting upload"
                        : `${fileUploadProgress}%`}
                    </p>
                  )}
                </Col>
                <Col
                  md={1}
                  className="d-flex align-items-start"
                  style={{ marginTop: "30px" }}
                >
                  <Button type="submit">Submit</Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Form>

        <Row style={{ marginTop: "20px" }}>
          <Col>
            <div
              className="p-3"
              style={{
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <h5>Previous Uploads</h5>
              {uploadHistory.length > 0 ? (
                <Table
                  striped
                  bordered
                  hover
                  size="sm"
                  className="text-center align-middle"
                >
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Filename</th>
                      <th>Playback</th>
                      <th>Created at</th>
                      <th>Audio Category</th>
                      <th>Audio Description</th>
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadHistory.map((entry, rowIndex) => (
                      <tr key={rowIndex}>
                        <td>{rowIndex + 1}</td>
                        <td>{entry.file_name}</td>
                        <td>
                          <audio controls preload="auto">
                            <source src={entry.s3_url} type="audio/mpeg" />
                          </audio>
                        </td>
                        <td>{entry.created_at}</td>
                        <td>{entry.audio_category}</td>
                        <td>{entry.audio_description}</td>
                        <td>
                          <Button
                            value={entry.s3_url}
                            variant="danger"
                            onClick={(e) => {
                              handleDelete(e.target.value);
                            }}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p>No audio files have been uploaded yet</p>
              )}
            </div>
          </Col>
        </Row>
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

export default Media;
