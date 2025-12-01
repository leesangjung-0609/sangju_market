// my_info.js (수정된 최종 버전)

// =========================================
// 1. HTML 템플릿 생성 함수 (수정 없음)
// =========================================
/**
 * 반복되는 카드 HTML 코드를 생성해줍니다.
 */
function createCardHTML(item, type) {
    // DB에서 가져오는 데이터 필드 이름에 맞게 조정 (상품 정보와 찜 목록 정보가 다름)
    
    let dateLabel = "등록일";
    let linkId = item.product_id || item.id;
    let imgUrl = item.image_url || item.img || 'https://via.placeholder.com/220x180?text=No+Image';
    let title = item.title;
    let price = item.price;
    let displayDate = item.created_at || item.date;

    if (type === 'sold') dateLabel = "판매일";
    if (type === 'bought') dateLabel = "구매일";
    if (type === 'wishlist') {
        // 찜 목록 아이템은 product_id와 price, title, image_url을 바로 가지고 있다고 가정
        dateLabel = "찜한 날짜";
        // 찜 목록 삭제 버튼 추가 (단, 찜 목록 전용 섹션이 아닌 곳에선 버튼 제거)
    }

    // 숫자 3자리마다 콤마 찍기
    const formattedPrice = price.toLocaleString();

    let buttonHtml = '';
    // 찜 목록 섹션에만 삭제 버튼 추가 로직
    if (type === 'wishlist') {
        buttonHtml = `<button class="btn btn-danger btn-remove-wish" data-id="${item.wishlist_id}">찜 삭제</button>`;
    }


    return `
        <div class="product-card ${type === 'wishlist' ? 'wishlist-card' : ''}">
          <a href="product_detail.html?id=${linkId}">
            <img src="${imgUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/220x180?text=No+Image'">
            <div class="card-content">
              <h4>${title}</h4>
              <p class="price">${formattedPrice}원</p>
              ${type !== 'wishlist' ? `<p class="date">${dateLabel}: ${displayDate}</p>` : ''}
              ${type === 'wishlist' && item.seller_name ? `<p class="seller">판매자: ${item.seller_name}</p>` : ''}
            </div>
          </a>
          ${buttonHtml}
        </div>
    `;
}

// =========================================
// 2. 화면에 렌더링하는 함수 (수정됨: 찜 목록 삭제 로직 추가)
// =========================================
/**
 * 렌더링 실행 함수
 */
function renderList(containerId, dataList, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (dataList.length === 0) {
        container.innerHTML = '<p style="padding: 20px; color: #888;">내역이 없습니다.</p>';
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
                            // 찜 목록이 비었는지 확인하고 메시지 업데이트 로직 추가 가능
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
// 3. 서버 데이터 로드 함수 (수정 없음)
// =========================================
/**
 * 서버에서 데이터를 가져와 렌더링하는 범용 함수
 */
async function loadDataAndRender(endpoint, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<p style="padding: 20px; color: #888;">데이터를 불러오는 중...</p>';
    
    try {
        const res = await fetch(endpoint, { credentials: "include" });

        if (res.status === 401) {
            container.innerHTML = `<p style="padding: 20px; color: red;">로그인이 필요합니다.</p>`;
            return;
        }

        if (!res.ok) {
            // 찜 목록 라우터가 아직 없으면 404가 발생할 수 있음
            if (endpoint === '/wishlist/list') { 
                container.innerHTML = `<p style="padding: 20px; color: #888;">찜 목록 라우터(GET /wishlist/list)가 구현되지 않았습니다.</p>`;
                return;
            }
            throw new Error(`데이터 로드 실패: ${endpoint}`);
        }

        const data = await res.json();
        renderList(containerId, data, type);

    } catch (error) {
        console.error(`[${containerId}] 데이터 로드 오류:`, error);
        container.innerHTML = `<p style="padding: 20px; color: red;">데이터를 불러오는 데 실패했습니다. (${type})</p>`;
    }
}

// =========================================
// 4. 초기화 및 실행
// =========================================

/**
 * 서버에서 현재 로그인된 사용자 정보를 가져옵니다. (my_info.html 상단 정보 채우기)
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
        document.querySelector(".info-value.id").textContent = data.username || "정보 없음";
        document.querySelector(".info-value.nickname").textContent = data.name || "정보 없음";
    } catch (err) {
        console.error("내 정보 로드 실패:", err);
        document.querySelector(".info-value.id").textContent = "오류";
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // 1. 사용자 정보 로드 및 표시
    loadUserInfo();

    // 2. 찜 목록 가져오기 (GET /wishlist/list 또는 /wishlist 사용)
    // 찜 목록 라우터는 GET /wishlist/list를 사용하도록 가정합니다.
    loadDataAndRender('/wishlist/list', 'wishlist-display', 'wishlist'); // 👈 ID를 'wishlist-display'로 변경

    // 3. 판매중 목록 가져오기
    loadDataAndRender('/product/selling', 'selling-list', 'selling');

    // 4. 판매 완료 목록 가져오기 (백엔드 /product/sold 라우터 구현 필요)
    loadDataAndRender('/product/sold', 'sales-list', 'sold');

    // 5. 구매 목록 가져오기 (백엔드 /product/bought 라우터 구현 필요)
    loadDataAndRender('/product/bought', 'purchase-list', 'bought');
});