
let loggedInUser = null; // 사용자명
let isLoggedIn = false;  // 로그인 상태
let status = null;       // 회원 상태: 'active', 'withdrawn'
function updateAuthMenu() {
    const authLink = document.getElementById('authLink');
    const authSubmenu = document.getElementById('authSubmenu');
    const mypageMenu = document.getElementById('mypageMenu');

    if (isLoggedIn) {
        // --- 로그인 상태 ---
        authLink.textContent = `${loggedInUser}님`;
        authSubmenu.innerHTML = `
      <li><a href="javascript:void(0);" onclick="logout()">로그아웃</a></li>
    `;

        // 마이페이지 보이기
        mypageMenu.style.display = "block";

    } else {
        // --- 로그아웃 상태 ---
        authLink.textContent = '로그인/회원가입';
        authSubmenu.innerHTML = `
      <li><a href="login.html">로그인</a></li>
      <li><a href="signup.html">회원가입</a></li>
    `;

        // 마이페이지 숨기기
        mypageMenu.style.display = "none";
    }
}
// ----------------------
// 로그인/회원 상태 변수
// ----------------------

async function checkLoginStatus() {
    try {
        const res = await fetch("/user/current", { credentials: 'include' });
        const data = await res.json();

        status = data.status; // 'active' or 'withdrawn'
        if (status === 'active') {
            loggedInUser = data.username;
            isLoggedIn = true;
        } else {
            loggedInUser = null;
            isLoggedIn = false;
        }

        updateAuthMenu();
    } catch (err) {
        console.error("로그인 상태 확인 실패:", err);
    }
}
document.addEventListener("DOMContentLoaded", () => {
    if (typeof checkLoginStatus === 'function') { // 함수가 로드되었는지 확인
        checkLoginStatus();
    }
});