import { useEffect, useState } from "react";
import LinkedInPosts from "./LinkedInPosts";
import "./LinkedInDashboard.css";

function LinkedInDashboard() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("token");

    if (accessToken) {
      setToken(accessToken);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    fetch("http://localhost:5001/auth/linkedin/profile", {
      headers: {
        Authorization: token
      }
    })
      .then(res => res.json())
      .then(data => {
        setProfile(data);

        fetch(
          `http://localhost:5001/auth/linkedin/posts?userId=${data.id}`,
          {
            headers: {
              Authorization: token
            }
          }
        )
          .then(res => res.json())
          .then(postData => {
            setPosts(postData.elements || []);
          });
      });
  }, [token]);

  return (
    <div>
      <h2>LinkedIn Dashboard</h2>

      {profile && (
        <div>
          <p>
            Name: {profile.localizedFirstName}{" "}
            {profile.localizedLastName}
          </p>
          <p>User ID: {profile.id}</p>
        </div>
      )}

      <LinkedInPosts posts={posts} />
    </div>
  );
};

export default LinkedInDashboard;
