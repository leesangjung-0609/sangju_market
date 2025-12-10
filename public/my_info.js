// my_info.js (최종 통합 및 정리 버전 - 수정 완료)

// =========================================
// 1. HTML 템플릿 생성 함수
// =========================================
/**
 * 반복되는 카드 HTML 코드를 생성해줍니다.
 */
function openEditPopup() {
    const popupWidth = 500;
    const popupHeight = 930; // 입력 필드가 많으므로 높이를 넉넉하게 잡음

    // 화면 중앙에 위치 계산
    const leftPosition = (window.screen.width / 3) * 2;
    const maxLeft = window.screen.width - popupWidth; // 화면 오른쪽 끝에 딱 붙는 위치

    // 오른쪽 1/3 지점과 화면 끝 중 더 안전한 위치 선택
    const left = Math.min(leftPosition, maxLeft);

    // 세로 위치는 화면 중앙 유지
    const top = (window.screen.height / 2) - (popupHeight / 2);

    // 팝업 옵션: 크기 고정(resizable=no), 스크롤 가능(scrollbars=yes)
    const options = `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=no,menubar=no,toolbar=no,resizable=no,scrollbars=yes`;

    window.open("my_info_edit.html", "editPopup", options);
}
function createCardHTML(item, type) {
    let dateLabel = "등록일";
    let linkId = item.product_id || item.id;
    let imgUrl = item.image_url || item.img || 'https://via.placeholder.com/220x180?text=No+Image';
    let title = item.title;
    let price = item.price;

    let displayDate = item.created_at || item.date;

    // ✅ 날짜 형식 YYYY-MM-DD 변환
    if (displayDate) {
        // created_at 필드는 ISO 형식(T 포함)으로 오므로, T를 기준으로 split합니다.
        displayDate = new Date(displayDate).toISOString().split("T")[0];
    }

    if (type === 'sold') dateLabel = "판매일";
    if (type === 'bought') dateLabel = "구매일";
    if (type === 'wishlist') dateLabel = "찜한 날짜";

    const formattedPrice = price.toLocaleString();

    let buttonHtml = '';
    if (type === 'wishlist') {
        // wishlist_id를 사용하여 찜 삭제 버튼 생성
        buttonHtml = `<button class="btn btn-danger btn-remove-wish" data-id="${item.wishlist_id}">찜 삭제</button>`;
    }
    else if (type === 'bought') {
        // 구매 내역일 경우 후기 작성 버튼 추가
        buttonHtml = `<a href="review_write.html?product_id=${linkId}" class="btn btn-primary btn-write-review">후기 작성</a>`;
    }
    // 판매자/구매자 정보 표시
    let partnerInfo = '';
    if (type === 'sold' && item.buyer_name) {
        partnerInfo = `<p class="partner">구매자: ${item.buyer_name}</p>`;
    } else if (type === 'bought' && item.seller_name) {
        partnerInfo = `<p class="partner">판매자: ${item.seller_name}</p>`;
    } else if (type === 'wishlist' && item.seller_name) {
        partnerInfo = `<p class="seller">판매자: ${item.seller_name}</p>`;
    }

    // ⭐⭐ [수정된 부분] 상태 뱃지 추가 로직 ⭐⭐
    let statusBadge = '';
    if (item.status) {
        if (item.status === '판매완료') {
            statusBadge = `<span class="status-badge sold-status">판매완료</span>`;
        } else if (item.status === '판매중') {
            statusBadge = `<span class="status-badge active-status">판매중</span>`;
        } else if (item.status === '예약중') {
            statusBadge = `<span class="status-badge reserved-status">예약중</span>`;
        }
    }
    // ⭐⭐ ----------------------------------- ⭐⭐


    return `
        <div class="product-card ${type === 'wishlist' ? 'wishlist-card' : ''}">
          <a href="product_detail.html?id=${linkId}">
            <img src="${imgUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/220x180?text=No+Image'">
            <div class="card-content">
              <h4>${title}</h4> <p class="price">${formattedPrice}원</p>
              ${partnerInfo}
              ${type !== 'wishlist' ? `<p class="date">${dateLabel}: ${displayDate}</p>` : ''}
              ${statusBadge} 
            </div>
          </a>
          ${buttonHtml}
        </div>
    `;
}

// =========================================
// 2. 화면에 렌더링하는 함수 (찜 목록 삭제 로직 포함)
// =========================================
/**
 * 렌더링 실행 함수
 */
function renderList(containerId, dataList, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (dataList.length === 0) {
        let emptyMessage = "내역이 없습니다.";
        if (type === 'selling') emptyMessage = "현재 판매중인 상품이 없습니다.";
        else if (type === 'sold') emptyMessage = "판매를 완료한 상품이 없습니다.";
        else if (type === 'bought') emptyMessage = "구매를 완료한 상품이 없습니다.";
        else if (type === 'wishlist') emptyMessage = "찜 목록이 비어 있습니다.";

        container.innerHTML = `<p style="padding: 20px; color: #888;">${emptyMessage}</p>`;
        return;
    }

    let htmlString = '';
    dataList.forEach(item => {
        htmlString += createCardHTML(item, type);
    });

    container.innerHTML = htmlString;

    // 찜 목록일 경우에만 삭제 버튼 이벤트 리스너 추가
    if (type === 'wishlist') {
        container.querySelectorAll('.btn-remove-wish').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault(); // 링크 이동 방지
                const wishlistId = e.target.getAttribute('data-id');
                if (confirm('정말로 찜 목록에서 삭제하시겠습니까?')) {
                    try {
                        const res = await fetch(`/wishlist/remove/${wishlistId}`, {
                            method: "DELETE",
                            credentials: "include"
                        });
                        if (res.ok) {
                            e.target.closest('.product-card').remove(); // 카드 삭제
                            alert('찜 목록에서 삭제되었습니다.');
                            // 렌더링 후 빈 목록인지 다시 확인하는 로직은 복잡해지므로, 새로고침을 유도하거나, 서버 응답이 성공하면 dataList에서 해당 항목을 제거 후 다시 렌더링하는 것이 좋습니다.
                        } else {
                            alert('찜 삭제 실패: 서버 오류');
                        }
                    } catch (error) {
                        console.error("찜 삭제 오류:", error);
                        alert('찜 삭제 중 네트워크 오류가 발생했습니다.');
                    }
                }
            });
        });
    }
}

// =========================================
// 3. 서버 데이터 로드 함수 (401 로그인 만료 처리 포함)
// =========================================
async function loadDataAndRender(endpoint, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 로딩 중 표시
    container.innerHTML = '<p style="padding: 20px; color: #888;">데이터를 불러오는 중...</p>';

    try {
        const res = await fetch(endpoint, { credentials: "include" });

        // 401 로그인 만료 처리
        if (res.status === 401) {
            alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
            window.location.href = "login.html"; // 로그인 페이지로 강제 이동
            return;
        }

        if (!res.ok) {
            // 찜 목록 라우터 미구현 시 처리
            if (endpoint === '/wishlist/list') {
                container.innerHTML = `<p style="padding: 20px; color: #888;">찜 목록 라우터가 구현되지 않았습니다.</p>`;
                return;
            }
            throw new Error(`데이터 로드 실패: ${endpoint}`);
        }

        const data = await res.json();
        // 데이터가 배열이 아닌 경우 (예: 서버에서 단일 객체만 보낸 경우) 대비
        const dataList = Array.isArray(data) ? data : (data ? [data] : []);

        renderList(containerId, dataList, type);

    } catch (error) {
        console.error(`[${containerId}] 데이터 로드 오류:`, error);
        // 네트워크 오류 등 심각한 오류 시
        container.innerHTML = `<p style="padding: 20px; color: red;">데이터를 불러오는 데 실패했습니다. (콘솔 확인)</p>`;
    }
}

// =========================================
// 4. HTML 유틸리티 함수 (my_info.html의 인라인 스크립트에서 이동)
// =========================================

function openWithdrawPopup() {
    const popupWidth = 500;
    const popupHeight = 650;
    const left = window.screen.width / 2 - popupWidth / 2;
    const top = window.screen.height / 2 - popupHeight / 2;

    window.open(
        "withdraw.html",
        "withdrawPopup",
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=no,menubar=no,toolbar=no,resizable=no`
    );
}

function clearSearchInput() {
    const searchInput = document.getElementById("searchInput");
    searchInput.value = "";
    showHideClearButton();
    searchInput.focus();
}

function showHideClearButton() {
    const searchInput = document.getElementById("searchInput");
    const clearBtn = document.getElementById("clearBtn");
    clearBtn.style.display = searchInput.value.length > 0 ? "block" : "none";
}

// =========================================
// 5. 사용자 정보 로드 및 표시
// =========================================

/**
 * 서버에서 현재 로그인된 사용자 정보를 가져옵니다.
 */
async function loadUserInfo() {
    try {
        const res = await fetch("/user/info", { credentials: "include" });
        if (res.status === 401) {
            alert("🔒 내 정보를 확인하려면 로그인이 필요합니다.");
            window.location.href = "login.html";
            return null;
        }
        if (!res.ok) throw new Error("정보를 불러오는 데 실패했습니다.");
        const data = await res.json();

        // 아이디, 닉네임, 이메일 표시
        document.querySelector(".info-value.id").textContent = data.username || "정보 없음";
        document.querySelector(".info-value.nickname").textContent = data.name || "정보 없음";
        document.querySelector(".info-value.email").textContent = data.email || "정보 없음";

        // 전화번호 형식 지정 (XXX-XXXX-XXXX)
        const formattedPhone = data.phone
            ? data.phone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")
            : "정보 없음";
        document.querySelector(".info-value.phone").textContent = formattedPhone;

        // 생년월일 형식 지정
        const rawBirth = data.birthdate || data.birth;
        const formattedBirth = rawBirth
            ? rawBirth
                .replace(/(\d{4})-(\d{2})-(\d{2})/, "$1.$2.$3")
                .replace(/(\d{4})(\d{2})(\d{2})/, "$1.$2.$3")
            : "정보 없음";
        document.querySelector(".info-value.birth").textContent = formattedBirth;

        // 성별 표시
        let genderDisplay = "정보 없음";
        if (data.gender) {
            const gender = data.gender;
            if (gender === "male") genderDisplay = "남성";
            else if (gender === "female") genderDisplay = "여성";
            else genderDisplay = "기타";
        }
        document.querySelector(".info-value.gender").textContent = genderDisplay;

    } catch (err) {
        console.error("내 정보 로드 실패:", err);
        document.querySelector(".info-value.id").textContent = "오류";
    }
}


// =========================================
// 6. 초기화 및 실행
// =========================================


