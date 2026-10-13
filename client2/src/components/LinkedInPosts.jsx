import { useState } from "react";
import EngagementPrediction from "./EngagementPrediction";
import "./LinkedInPosts.css";

function LinkedInPosts ({ posts }) {
  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAnalyze = (post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  return (
    <div>
      <h3>Your Posts</h3>

      {posts.length === 0 && <p>No posts found</p>}

      {posts.map(post => {
        const content =
          post.specificContent?.["com.linkedin.ugc.ShareContent"]
            ?.shareCommentary?.text;

        const time = new Date(post.created?.time);

        return (
          <div
            key={post.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px"
            }}
          >
            <p>{content}</p>
            <small>{time.toLocaleString()}</small>
            <button onClick={() => handleAnalyze(post)}>Analyze Engagement</button>
          </div>
        );
      })}

      <EngagementPrediction
        selectedPost={selectedPost}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default LinkedInPosts;
