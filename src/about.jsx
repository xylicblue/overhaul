import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Link as Routerlink } from "react-router-dom";
import "./about.css";

import ceoPortrait from "./assets/gabe.jpg";
import logoImage from "./assets/logo2.png";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

const AboutPage = () => {
  return (
    <>
      <title>About Us | Byte Strike</title>
      <meta
        name="description"
        content="Learn about the mission and team behind Byte Strike, founded by Gabe Jaffe."
      />
      <div className="about-page">
        {/* A simplified header for this page */}
        <header className="about-header">
          <nav>
            <Routerlink to="/" className="logo">
              <img src={logoImage} alt="Byte Strike Logo" />
            </Routerlink>
            {/* <div className="logo">
                     
                      <span>Byte Strike</span>
                    </div> */}
            <ul className="nav-links">
              <li>
                <Link to="/">Home</Link>
              </li>
              {/* <li>
              <a href="#">Careers</a>
            </li>{" "} */}
              {/* Placeholder */}
            </ul>
          </nav>
        </header>

        {/* --- Section 1: Hero --- */}
        {/* <motion.section
        className="about-hero"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <div className="content-container">
          <h1>Pioneering the Future of Digital Infrastructure</h1>
          <p className="subtitle">
            We are building the foundational financial layer for the age of AI,
            transforming compute from a simple utility into a tradable,
            transparent commodity.
          </p>
        </div>
      </motion.section> */}

        {/* --- Section 2: Meet the Founder --- */}
        <motion.section
          className="team-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeIn}
        >
          <div className="team-container">
            <motion.div
              className="team-photo"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <img src={ceoPortrait} alt="Gabe Jaffe, Founder & CEO" />
            </motion.div>
            <div className="team-bio">
              <h2>Meet Our Founder</h2>
              <h3>Gabe Jaffe, Founder & CEO</h3>
              <p>
                Gabe Jaffe is a Sophomore student at the McDonough School of
                Business at Georgetown University. At the age of 15, he founded
                his first company, Teen Hampton and Teen NYC, a digital platform
                for teenage tutors, sports instructors, and babysitters, that
                has housed more than 100 workers and served more than 1,000
                clients. As Gabe scaled the business, he appeared on <br></br>
                <a
                  href="https://www.youtube.com/watch?v=MJko_jIdZxk"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#0274ef",
                    fontWeight: "bold",
                    textDecoration: "none",
                  }}
                >
                  Good Day New York
                </a>
                ,{" "}
                <a
                  href="https://www.foxnews.com/video/6307767277112"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#0274ef",
                    fontWeight: "bold",
                    textDecoration: "none",
                  }}
                >
                  Fox National News
                </a>
                ,{" "}
                <a
                  href="https://www.youtube.com/watch?v=stkR3mEhIAQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#0274ef",
                    fontWeight: "bold",
                    textDecoration: "none",
                  }}
                >
                  CBS Inside Edition
                </a>
                , and more to discuss his accomplishments. Now, he is working to
                build the foundations of a futures market for compute as a
                commodity to accelerate AI learning and market growth.
              </p>
              <blockquote className="quote">
                "We stand at a pivotal moment where computational power is the
                most critical resource on the planet. Our mission is to build
                the tools that will power the next century of innovation with
                stability and foresight."
              </blockquote>
              <div
                className="contact-info"
                style={{
                  marginTop: "2.5rem",
                  paddingTop: "1.5rem",
                  borderTop: "1px solid #4a5568",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span style={{ fontWeight: "bold", color: "#a0aec0" }}>
                  Contact Gabe Jaffe:
                </span>
                <a
                  href="mailto:gabe.jaffe@bytestrike.com"
                  style={{
                    color: "#0274ef",
                    fontWeight: "bold",
                    //                  textDecoration: "none",
                  }}
                >
                  gabejaffe@byte-strike.com
                </a>
              </div>
            </div>
          </div>
        </motion.section>

        {/* --- Section 3: Core Values --- */}
        {/* <motion.section
        className="values-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeIn}
      >
        <div className="content-container">
          <h2>Our Core Values</h2>
          <div className="values-grid">
            <div className="value-card">
              <h4>Innovation</h4>
              <p>
                We are relentlessly curious, constantly pushing the boundaries
                of what's possible in financial technology and digital
                infrastructure.
              </p>
            </div>
            <div className="value-card">
              <h4>Transparency</h4>
              <p>
                We believe open, accessible markets create fairer outcomes for
                everyone. Our commitment is to price discovery and clarity.
              </p>
            </div>
            <div className="value-card">
              <h4>Integrity</h4>
              <p>
                Trust is our most important asset. We are committed to the
                highest standards of security, compliance, and ethical conduct.
              </p>
            </div>
          </div>
        </div>
      </motion.section> */}

        {/* A simple footer for this page */}
        <footer className="about-footer">
          <p>© {new Date().getFullYear()} Byte Strike. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
};

export default AboutPage;
