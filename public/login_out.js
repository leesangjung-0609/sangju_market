
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

// ... 기존 변수 선언 부분 ...
async function logout() {
    try {
        const res = await fetch("/user/logout", {
            method: 'POST',
            credentials: 'include' // 세션 쿠키를 서버로 전송
        });

        if (res.ok) {
            // 클라이언트 상태 초기화
            loggedInUser = null;
            isLoggedIn = false;
            status = null;
            
            // UI 업데이트 (로그인/회원가입 메뉴로 돌아감)
            updateAuthMenu();
            
            alert("로그아웃되었습니다.");
            // 메인 페이지로 이동하거나 현재 페이지를 새로고침
            window.location.href = "main.html"; // 적절한 페이지로 변경
        } else {
            // 로그아웃 실패 시 서버 응답 메시지 확인
            const errorText = await res.text();
            console.error("로그아웃 요청 실패:", errorText);
            alert("로그아웃에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
    } catch (err) {
        console.error("로그아웃 중 통신 오류:", err);
        alert("서버와 통신에 문제가 발생했습니다.");
    }
}
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
        
        // 로그인 상태에 따라 UI 업데이트 (여기서 authMenu, mypageMenu 제어)
        updateAuthMenu(); 

    } catch (err) {
        console.error("로그인 상태 확인 실패:", err);
        // 에러가 발생해도 메뉴는 기본(로그아웃) 상태로 업데이트 해줘야 함
        isLoggedIn = false; 
        updateAuthMenu();
    } finally {
        // [핵심 수정] 성공/실패 여부와 상관없이 통신이 끝나면 화면을 보여줌
        document.body.classList.remove('loading-screen');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (typeof checkLoginStatus === 'function') {
        checkLoginStatus();
    }
});