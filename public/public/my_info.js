// my_products.js

/**
 * 1. 데이터 준비 (DB 대용 Mock Data)
 * 나중에는 이 부분을 서버 fetch로 대체하면 됩니다.
 */
const mockData = {
    selling: [
        { id: 1, title: "거의 새것! 게이밍 마우스", price: 35000, date: "2025-11-01", img: "https://via.placeholder.com/220x180" },
        { id: 2, title: "제목이 아주 긴 상품입니다...", price: 12000, date: "2025-10-28", img: "https://via.placeholder.com/220x180" }
    ],
    sold: [
        { id: 3, title: "판매된 상품 1", price: 10000, date: "2025-10-05", img: "activity.jpg" }, // 이미지 경로는 실제 파일명으로 수정 필요
        { id: 4, title: "판매된 상품 2", price: 12000, date: "2025-09-28", img: "healing.jpg" }
    ],
    bought: [
        { id: 5, title: "구매한 상품 A", price: 8000, date: "2025-10-12", img: "https://via.placeholder.com/220" },
        { id: 6, title: "구매한 상품 B", price: 15000, date: "2025-09-10", img: "https://via.placeholder.com/220" }
    ]
};

/**
 * 2. HTML 템플릿 생성 함수
 * 반복되는 카드 HTML 코드를 생성해줍니다.
 */
function createCardHTML(item, type) {
    // 날짜 라벨을 타입에 따라 다르게 표시 (등록일/판매일/구매일)
    let dateLabel = "등록일";
    if (type === 'sold') dateLabel = "판매일";
    if (type === 'bought') dateLabel = "구매일";

    // 숫자 3자리마다 콤마 찍기
    const formattedPrice = item.price.toLocaleString();

    return `
        <div class="product-card">
          <a href="product_detail.html?id=${item.id}">
            <img src="${item.img}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/220x180'">
            <div class="card-content">
              <h4>${item.title}</h4>
              <p class="price">${formattedPrice}원</p>
              <p class="date">${dateLabel}: ${item.date}</p>
            </div>
          </a>
        </div>
    `;
}

/**
 * 3. 화면에 렌더링하는 함수
 */
function renderList(containerId, dataList, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 기존 내용 비우기
    container.innerHTML = '';

    // 데이터가 없을 경우 처리
    if (dataList.length === 0) {
        container.innerHTML = '<p style="padding: 20px; color: #888;">내역이 없습니다.</p>';
        return;
    }

    // HTML 생성 및 주입
    let htmlString = '';
    dataList.forEach(item => {
        htmlString += createCardHTML(item, type);
    });
    
    container.innerHTML = htmlString;
}

/**
 * 4. 실행 (페이지 로드 시)
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1) 지금은 Mock Data로 바로 그리기
    renderList('selling-list', mockData.selling, 'selling');
    renderList('sales-list', mockData.sold, 'sold');
    renderList('purchase-list', mockData.bought, 'bought');

    /* // 2) 나중에 DB 연동 시 사용할 코드 예시
    const userId = localStorage.getItem("userId");
    
    // 판매중 목록 가져오기
    fetch(`http://localhost:3000/products/selling?userId=${userId}`)
        .then(res => res.json())
        .then(data => renderList('selling-list', data, 'selling'));

    // 판매 완료 목록 가져오기
    fetch(`http://localhost:3000/products/sold?userId=${userId}`)
        .then(res => res.json())
        .then(data => renderList('sales-list', data, 'sold'));
        
    // 구매 목록 가져오기
    fetch(`http://localhost:3000/products/bought?userId=${userId}`)
        .then(res => res.json())
        .then(data => renderList('purchase-list', data, 'bought'));
    */
});