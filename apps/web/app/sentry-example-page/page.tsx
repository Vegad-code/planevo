"use client";

import Head from "next/head";

export default function Page() {
  return (
    <div>
      <Head>
        <title>Sentry Onboarding</title>
      </Head>

      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: "4rem", margin: "14px 0" }}>
          Sentry Example Page
        </h1>
        <p>Get started by sending us a sample error:</p>
        <button
          onClick={() => {
            throw new Error("Sentry Test Error");
          }}
          style={{
            padding: "12px",
            cursor: "pointer",
            backgroundColor: "#ad28b8",
            borderRadius: "4px",
            border: "none",
            color: "white",
            fontSize: "14px",
            margin: "18px",
          }}
        >
          Throw error!
        </button>
      </main>
    </div>
  );
}
