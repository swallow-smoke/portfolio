let accounts = {};

fetch("../assets/account.json")
  .then((res) => res.json())
  .then((data) => {
    accounts = data;
  });

document.getElementById("login-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("username-field").value.trim();
  const password = document.getElementById("password-field").value;
  const errorBox = document.getElementById("login-error");

  if (accounts[username] && accounts[username].password === password) {
    // 로그인 성공 → 지도 페이지로 이동
    window.location.href = "./main.html";
  } else {
    errorBox.style.opacity = 1;
  }
});
