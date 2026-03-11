/* =========================
   GLOBAL FLAGS
========================= */
let voteInProgress = false;

/* =========================
   CSRF TOKEN HELPER
========================= */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        document.cookie.split(";").forEach(cookie => {
            cookie = cookie.trim();
            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(
                    cookie.substring(name.length + 1)
                );
            }
        });
    }
    return cookieValue;
}

const csrftoken = getCookie("csrftoken");

/* =========================
   REGISTRATION FORM
========================= */
const registrationForm = document.getElementById("registrationForm");

if (registrationForm) {
    registrationForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData(this);
        const password = formData.get("password");
        const confirmPassword = formData.get("confirm_password");
        const govtVoterId = formData.get("govt_voter_id");

        if (!govtVoterId) {
            alert("Government Voter ID is required");
            return;
        }

        if (!password || !confirmPassword) {
            alert("Password fields are missing");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        fetch("/register-user/", {
            method: "POST",
            headers: {
                "X-CSRFToken": csrftoken
            },
            body: formData,
            credentials: "same-origin"
// 🔥 REQUIRED FOR RAILWAY
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            if (data.success) {
                window.location.href = "/";
            }
        })
        .catch(err => {
            console.error("Registration Error:", err);
            alert("Registration failed");
        });
    });
}

/* =========================
   LOGIN FORM
========================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData(this);

        fetch("/login-user/", {
            method: "POST",
            headers: {
                "X-CSRFToken": csrftoken
            },
            body: formData,
            credentials: "same-origin"

        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            if (data.success) {
                window.location.href = data.redirect_url || "/dashboard/";
            }
        })
        .catch(err => {
            console.error("Login Error:", err);
            alert("Login failed");
        });
    });
}

/* =========================
   VOTING FORM
========================= */
const voteForm = document.getElementById("voteForm");

if (voteForm) {
    voteForm.addEventListener("submit", function (e) {
        e.preventDefault();

        if (voteInProgress) return;
        voteInProgress = true;

        const submitButton = voteForm.querySelector("button");
        submitButton.disabled = true;
        submitButton.innerText = "Submitting...";

        const selectedCandidate = document.querySelector(
            'input[name="candidate"]:checked'
        );

        if (!selectedCandidate) {
            alert("Please select a candidate");
            submitButton.disabled = false;
            submitButton.innerText = "Vote";
            voteInProgress = false;
            return;
        }

        const formData = new FormData();
        formData.append("candidate_id", selectedCandidate.value);

        fetch("/submit-vote/", {
            method: "POST",
            headers: {
                "X-CSRFToken": csrftoken
            },
            body: formData,
           credentials: "same-origin"

        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                submitButton.innerText = "Voted ✅";
                launchConfetti();
                setTimeout(() => {
                    window.location.href = "/results/";
                }, 2500);
            } else {
                alert(data.message);
                submitButton.disabled = false;
                submitButton.innerText = "Vote";
                voteInProgress = false;
            }
        })
        .catch(err => {
            console.error("Vote Error:", err);
            alert("Something went wrong while voting");
            submitButton.disabled = false;
            submitButton.innerText = "Vote";
            voteInProgress = false;
        });
    });
}

/* =========================
   CONFETTI FUNCTION
========================= */
function launchConfetti() {
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

    for (let i = 0; i < 120; i++) {
        const confetti = document.createElement("div");
        confetti.classList.add("confetti");

        confetti.style.left = Math.random() * 100 + "vw";
        confetti.style.backgroundColor =
            colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration =
            Math.random() * 2 + 2 + "s";

        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 3000);
    }
}
