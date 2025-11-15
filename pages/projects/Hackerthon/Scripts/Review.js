// Scripts/Review.js

var db; // IndexedDB 데이터베이스 인스턴스를 저장할 전역 변수

// IndexedDB 데이터베이스 열기 요청
// 데이터베이스 이름은 'review_db', 버전은 1
var request = window.indexedDB.open("review_db", 1);

// 데이터베이스 열기 실패 시 이벤트 핸들러
request.onerror = function (event) {
    console.error("IndexedDB 오류:", event.target.errorCode);
    document.getElementById('reviews-list').innerHTML = '<p style="color: red;">리뷰 데이터베이스를 여는 데 오류가 발생했습니다.</p>';
};

// 데이터베이스 열기 성공 시 이벤트 핸들러
request.onsuccess = function (event) {
    db = event.target.result; // 데이터베이스 인스턴스 할당
    console.log("IndexedDB 'review_db' 데이터베이스 열기 성공!");

    // 페이지 로드 시 'review-item-id' 입력란의 초기 값(기본 쉼터)에 해당하는 리뷰를 표시
    // 사용자가 처음 접속했을 때 모든 리뷰를 보게 하려면, loadReviewsForItemId() 대신 displayReviews()를 호출
    const initialItemIdInput = document.getElementById('review-item-id');
    if (initialItemIdInput && initialItemIdInput.value) {
        loadReviewsForItemId(initialItemIdInput.value);
    } else {
        // 특정 아이템 ID가 없으면 모든 리뷰 표시 (옵션)
        displayReviews();
    }
};

// 데이터베이스 버전 변경 (생성 또는 업그레이드) 시 이벤트 핸들러
request.onupgradeneeded = function (event) {
    var db = event.target.result;
    // 'reviews'라는 객체 저장소 생성. 'id'를 기본 키로 사용하고 자동 증가 설정
    var objectStore = db.createObjectStore("reviews", { keyPath: "id", autoIncrement: true });
    // 'itemId' 필드에 인덱스 생성 (검색 효율 향상)
    objectStore.createIndex("itemId", "itemId", { unique: false });
    console.log("IndexedDB 객체 저장소 'reviews' 생성/업그레이드.");
};

/**
 * 리뷰를 추가하는 함수
 * @param {string} itemId - 리뷰를 남길 아이템의 ID (예: 쉼터명)
 * @param {number} rating - 평점 (1~5)
 * @param {string} comment - 리뷰 내용
 */
function addReview(itemId, rating, comment) {
    if (!db) {
        console.error("데이터베이스가 초기화되지 않았습니다.");
        alert("데이터베이스 연결 중입니다. 잠시 후 다시 시도해주세요.");
        return;
    }

    if (!itemId || !comment || isNaN(rating) || rating < 1 || rating > 5) {
        alert("아이템 ID, 평점, 리뷰 내용을 모두 입력해주세요.");
        return;
    }

    var transaction = db.transaction(["reviews"], "readwrite");
    var objectStore = transaction.objectStore("reviews");

    var review = {
        itemId: itemId,
        rating: rating,
        comment: comment,
        timestamp: new Date().toISOString() // 리뷰 작성 시간
    };

    var request = objectStore.add(review);

    request.onsuccess = function (event) {
        console.log("리뷰가 성공적으로 추가되었습니다:", event.target.result);
        alert("리뷰가 등록되었습니다!");
        // 리뷰 등록 후 폼 초기화
        document.getElementById('review-rating').value = 5;
        document.getElementById('review-comment').value = '';
        // 현재 아이템에 대한 리뷰 목록 새로고침
        loadReviewsForItemId(itemId);
    };

    request.onerror = function (event) {
        console.error("리뷰 추가 실패:", event.target.error);
        alert("리뷰 등록에 실패했습니다.");
    };
}

/**
 * 특정 아이템 ID에 해당하는 리뷰를 불러와 표시하는 함수
 * @param {string} itemId - 리뷰를 불러올 아이템의 ID
 */
function loadReviewsForItemId(itemId) {
    if (!db) {
        console.error("데이터베이스가 초기화되지 않았습니다.");
        return;
    }

    const transaction = db.transaction(["reviews"], "readonly");
    const objectStore = transaction.objectStore("reviews");
    const index = objectStore.index("itemId"); // itemId 인덱스 사용

    const reviews = [];
    index.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
            // 커서의 itemId가 현재 아이템 ID와 일치하는 경우에만 추가
            if (cursor.value.itemId === itemId) {
                reviews.push(cursor.value);
            }
            cursor.continue();
        } else {
            // 커서가 끝나면 리뷰 표시
            displayReviews(reviews); // 필터링된 리뷰 목록을 전달
        }
    };

    index.openCursor().onerror = function (event) {
        console.error("특정 아이템 ID 리뷰 불러오기 실패:", event.target.error);
        document.getElementById('reviews-list').innerHTML = '<p style="color: red;">리뷰를 불러오는 데 실패했습니다.</p>';
    };
}


/**
 * 모든 리뷰를 불러와 표시하는 함수 (또는 필터링된 목록을 받아 표시)
 * @param {Array} [filteredReviews] - 선택적으로 필터링된 리뷰 목록
 */
function displayReviews(filteredReviews = null) {
    if (!db) {
        console.error("데이터베이스가 초기화되지 않았습니다.");
        return;
    }

    const reviewsListDiv = document.getElementById('reviews-list');
    reviewsListDiv.innerHTML = '<h3>리뷰 목록</h3>'; // 기존 목록 초기화

    const transaction = db.transaction(["reviews"], "readonly");
    const objectStore = transaction.objectStore("reviews");
    const allReviews = [];

    objectStore.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
            allReviews.push(cursor.value);
            cursor.continue();
        } else {
            // 모든 리뷰를 가져온 후 필터링된 목록이 있으면 그것을 사용, 없으면 전체 목록 사용
            const reviewsToDisplay = filteredReviews || allReviews;

            if (reviewsToDisplay.length === 0) {
                reviewsListDiv.innerHTML += '<p>등록된 리뷰가 없습니다.</p>';
                return;
            }

            reviewsToDisplay.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // 최신순 정렬

            reviewsToDisplay.forEach(review => {
                const reviewItem = document.createElement('div');
                reviewItem.className = 'review-item';
                const stars = '⭐'.repeat(review.rating);

                // XSS 방지를 위해 textContent 사용 또는 escapeHTML 함수 사용
                reviewItem.innerHTML = `
                    <p><strong>아이템:</strong> ${escapeHTML(review.itemId)}</p>
                    <p><span class="rating-stars">${stars}</span></p>
                    <p>${escapeHTML(review.comment)}</p>
                    <p class="review-date">${new Date(review.timestamp).toLocaleString()}</p>
                    <button class="delete-button" onclick="deleteReview(${review.id})">삭제</button>
                `;
                reviewsListDiv.appendChild(reviewItem);
            });
        }
    };

    objectStore.openCursor().onerror = function (event) {
        console.error("리뷰 불러오기 실패:", event.target.error);
        reviewsListDiv.innerHTML = '<p style="color: red;">리뷰를 불러오는 데 실패했습니다.</p>';
    };
}

/**
 * 리뷰를 검색하는 함수 (아이템 ID 또는 댓글 내용으로 검색)
 * @param {string} query - 검색어
 */
function searchReviews(query) {
    if (!db) {
        console.error("데이터베이스가 초기화되지 않았습니다.");
        alert("데이터베이스 연결 중입니다. 잠시 후 다시 시도해주세요.");
        return;
    }

    const transaction = db.transaction(["reviews"], "readonly");
    const objectStore = transaction.objectStore("reviews");
    const searchResults = [];
    const lowerCaseQuery = query.toLowerCase(); // 검색어를 소문자로 변환

    objectStore.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
            // 아이템 ID 또는 댓글 내용에 검색어가 포함되어 있는지 확인 (대소문자 구분 없음)
            if (cursor.value.itemId.toLowerCase().includes(lowerCaseQuery) ||
                cursor.value.comment.toLowerCase().includes(lowerCaseQuery)) {
                searchResults.push(cursor.value);
            }
            cursor.continue();
        } else {
            displayReviews(searchResults); // 검색 결과 표시
        }
    };

    objectStore.openCursor().onerror = function (event) {
        console.error("리뷰 검색 실패:", event.target.error);
        document.getElementById('reviews-list').innerHTML = '<p style="color: red;">리뷰 검색에 실패했습니다.</p>';
    };
}


/**
 * 리뷰를 삭제하는 함수
 * @param {number} reviewId - 삭제할 리뷰의 ID (IndexedDB의 keyPath 'id'에 해당)
 */
function deleteReview(reviewId) {
    if (!db) {
        console.error("데이터베이스가 초기화되지 않았습니다.");
        alert("데이터베이스 연결 중입니다. 잠시 후 다시 시도해주세요.");
        return;
    }

    if (!confirm("이 리뷰를 정말로 삭제하시겠습니까?")) {
        return; // 사용자가 취소를 누르면 함수 종료
    }

    var transaction = db.transaction(["reviews"], "readwrite");
    var objectStore = transaction.objectStore("reviews");
    var deleteRequest = objectStore.delete(reviewId); // 해당 ID의 리뷰 삭제

    deleteRequest.onsuccess = function () {
        console.log("리뷰가 성공적으로 삭제되었습니다:", reviewId);
        // 삭제 후, 현재 아이템 ID가 설정되어 있다면 해당 아이템의 리뷰 목록 새로고침
        const currentItemId = document.getElementById('review-item-id')?.value;
        if (currentItemId) {
            loadReviewsForItemId(currentItemId);
        } else {
            displayReviews(); // itemId가 없으면 모든 리뷰 표시
        }
        alert("리뷰가 삭제되었습니다.");
    };

    deleteRequest.onerror = function (event) {
        console.error("리뷰 삭제 실패:", event.target.error);
        alert("리뷰 삭제에 실패했습니다.");
    };
}

// HTML 엔티티 이스케이프 함수 (XSS 방지) - 이 파일에서 자체적으로 사용되므로 추가합니다.
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}