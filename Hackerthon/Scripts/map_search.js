let map;
let currentMarker = null;
let tunnelMarkers = []; // 터널 마커들을 저장할 배열
let allTunnelData = []; // API에서 가져온 모든 터널 데이터를 저장할 변수

// 국토교통부 터널 API의 실제 엔드포인트와 서비스 키를 여기에 입력하세요.
// 공공데이터포털에서 API 신청 후 발급받은 정보로 변경해야 합니다.
const MO_TRAN_API_BASE_URL = 'http://apis.data.go.kr/1613000/btiData';
const MO_TRAN_API_TUNNEL_LIST_PATH = '/getTunlList';

// TODO: 여기에 실제 발급받은 **인코딩되지 않은 순수 서비스 키**를 입력하세요.
// URL 인코딩은 URLSearchParams가 자동으로 처리합니다.
const MO_TRAN_API_SERVICE_KEY = 'dkKrjHg4eN1Q5uXIP5TN+6hHPSlhPZQxGiL4mNBPJTZlE//0C/l4Gp8poVRGnEy0IZOAvzSkqirKaLfTHowsYA=='; // 사용자가 제공한 키로 교체됨

function initMap() {
  map = new naver.maps.Map("map", {
    center: new naver.maps.LatLng(37.5665, 126.9780), // 서울 시청을 중심으로 설정
    zoom: 10
  });
  fetchTunnelData();
  setupResizer(); // 리사이저 설정 함수 호출
}

async function fetchTunnelData() {
  const params = {
    serviceKey: MO_TRAN_API_SERVICE_KEY, // 인코딩되지 않은 순수 키 사용 (URLSearchParams가 인코딩 처리)
    pageNo: 1,
    numOfRows: 100, // 더 많은 데이터를 가져오기 위해 충분히 큰 값 설정
    hyear: 2023, // 2023년 데이터로 변경하여 시도
    responseType: 'xml' // API가 XML을 반환하므로 'xml'로 설정
  };
  const queryString = new URLSearchParams(params).toString();
  const requestUrl = `${MO_TRAN_API_BASE_URL}${MO_TRAN_API_TUNNEL_LIST_PATH}?${queryString}`;

  console.log("API 요청 URL:", requestUrl); // 디버깅을 위해 요청 URL 출력

  try {
    const response = await fetch(requestUrl);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    const xmlText = await response.text(); // XML 텍스트로 가져오기
    console.log("API 응답 (XML):", xmlText);
    processTunnelData(xmlText); // XML 텍스트를 처리 함수로 전달
  } catch (error) {
    console.error("터널 데이터를 가져오는 중 오류 발생:", error);
    document.getElementById('search-results').innerHTML = `<p style='color: red;'>터널 데이터를 가져오는데 실패했습니다: ${error.message}</p>`;
  }
}

// 모든 마커를 지도에 렌더링하고 관리하는 새로운 함수
function renderMarkersOnMap(tunnelsToRender) {
    // 기존 마커들을 모두 지도에서 제거하고 배열 비우기
    tunnelMarkers.forEach(marker => marker.setMap(null));
    tunnelMarkers = [];

    // 새로운 마커들을 추가
    tunnelsToRender.forEach(tunnel => {
        if (!isNaN(tunnel.lat) && !isNaN(tunnel.lng)) {
            const position = new naver.maps.LatLng(tunnel.lat, tunnel.lng);
            const marker = new naver.maps.Marker({
                map: map,
                position: position,
                title: tunnel.name,
            });

            naver.maps.Event.addListener(marker, 'click', function() {
                if (currentMarker) {
                    currentMarker.setMap(null); // 이전 클릭 마커 제거
                }
                currentMarker = marker;
                updateTunnelInfo(tunnel);
            });

            tunnelMarkers.push(marker);
        }
    });
}

function processTunnelData(xmlText) {
  allTunnelData = []; // 이전 데이터 초기화
  const searchResultsDiv = document.getElementById('search-results');
  searchResultsDiv.innerHTML = '';

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml"); // XML 파싱

    const cmmMsgHeader = xmlDoc.querySelector('cmmMsgHeader');
    if (cmmMsgHeader) {
        // 서비스 키 오류와 같은 공통 API 오류를 처리합니다.
        const returnReasonCodeElement = cmmMsgHeader.querySelector('returnReasonCode');
        const returnAuthMsgElement = cmmMsgHeader.querySelector('returnAuthMsg');
        const errMsgElement = cmmMsgHeader.querySelector('errMsg');

        const returnReasonCode = returnReasonCodeElement ? returnReasonCodeElement.textContent : '';
        const returnAuthMsg = returnAuthMsgElement ? returnAuthMsgElement.textContent : '';
        const errMsg = errMsgElement ? errMsgElement.textContent : '알 수 없는 오류';

        searchResultsDiv.innerHTML = `<p style='color: red;'>API 오류: ${returnAuthMsg || errMsg} (코드: ${returnReasonCode})</p>`;
        console.error("API Error (Tunnel - cmmMsgHeader):", returnAuthMsg, returnReasonCode, errMsg);
        renderMarkersOnMap([]); // 오류 발생 시 마커 비우기
        return; // cmmMsgHeader 오류가 발생하면 더 이상 진행하지 않습니다.
    }

    // cmmMsgHeader 오류가 없으면, 애플리케이션 관련 헤더를 확인합니다.
    const resultCodeElement = xmlDoc.querySelector('header > resultCode');
    const resultMsgElement = xmlDoc.querySelector('header > resultMsg');
    const resultCode = resultCodeElement ? resultCodeElement.textContent : '99';
    const resultMsg = resultMsgElement ? resultMsgElement.textContent : '알 수 없는 오류';

    if (resultCode !== '00') {
      searchResultsDiv.innerHTML = `<p style='color: red;'>API 오류: ${resultMsg} (코드: ${resultCode})</p>`;
        console.error("API Error (Tunnel - header):", resultMsg, resultCode);
        renderMarkersOnMap([]); // 오류 발생 시 마커 비우기
        return;
    }

    // 오류가 없으면 항목들을 파싱합니다.
    const items = xmlDoc.querySelectorAll("item");

    if (items.length === 0) {
        searchResultsDiv.innerHTML = `<p>2023년 터널 데이터가 없습니다. 다른 연도를 시도해보세요.</p>`;
        console.log("No tunnel data found for 2023.");
        renderMarkersOnMap([]); // 데이터 없을 시 마커 비우기
        return;
    }

    items.forEach(item => {
      // XML 요소에서 데이터 추출 (콘솔 로그를 통해 확인된 실제 태그 이름으로 수정)
      const name = item.querySelector("facilName")?.textContent || "알 수 없는 터널"; // tunlName -> facilName
      const latitude = parseFloat(item.querySelector("sLatitude")?.textContent); // latitude -> sLatitude
      const longitude = parseFloat(item.querySelector("sLongitude")?.textContent); // longitude -> sLongitude
      const completionYear = item.querySelector("openYear")?.textContent || "정보 없음"; // comptYear -> openYear
      const juso = item.querySelector("juso")?.textContent || "정보 없음";
      const newJuso = item.querySelector("newJuso")?.textContent || "정보 없음";
      const length = item.querySelector("length")?.textContent || "정보 없음";
      const totWidth = item.querySelector("totWidth")?.textContent || "정보 없음";
      const lineNum = item.querySelector("lineNum")?.textContent || "정보 없음";
      const orgmNm = item.querySelector("orgmNm")?.textContent || "정보 없음";
      const orgmTel = item.querySelector("orgmTel")?.textContent || "정보 없음";
      const checkDate = item.querySelector("checkDate")?.textContent || "정보 없음";
      const grade = item.querySelector("grade")?.textContent || "정보 없음";

      if (!isNaN(latitude) && !isNaN(longitude)) {
        allTunnelData.push({
          name,
          completionYear,
          lat: latitude,
          lng: longitude,
          juso,
          newJuso,
          length,
          totWidth,
          lineNum,
          orgmNm,
          orgmTel,
          checkDate,
          grade
        });
      }
    });

    renderMarkersOnMap(allTunnelData); // 모든 로드된 터널에 대해 마커 렌더링
    displaySearchResults(allTunnelData); // 이 부분은 왼쪽 검색 결과 목록을 업데이트합니다.
    console.log("터널 데이터 로드 완료:", allTunnelData.length + "개");
  } catch (error) {
    console.error("터널 데이터 처리 중 오류 발생:", error);
    searchResultsDiv.innerHTML = `<p style='color: red;'>터널 데이터 처리 중 예외 발생: ${error.message}</p>`;
  }
}

function displaySearchResults(results) {
  const searchResultsDiv = document.getElementById('search-results');
  searchResultsDiv.innerHTML = '';

  if (results.length > 0) {
    results.forEach(tunnel => {
      const p = document.createElement('p');
      p.textContent = tunnel.name;
      p.onclick = () => {
        map.setCenter(new naver.maps.LatLng(tunnel.lat, tunnel.lng));
        updateTunnelInfo(tunnel);
      };
      searchResultsDiv.appendChild(p);
    });
  } else {
    searchResultsDiv.innerHTML = '<p>검색 결과가 없습니다.</p>';
  }
}

document.getElementById('search-button').addEventListener('click', function() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const filteredTunnels = allTunnelData.filter(tunnel =>
    tunnel.name.toLowerCase().includes(searchTerm)
  );
  displaySearchResults(filteredTunnels);
  renderMarkersOnMap(filteredTunnels); // 필터링된 터널에 대해 마커 렌더링
  updateTunnelInfo(null);
});

// 터널 정보를 왼쪽에 표시하는 함수
function updateTunnelInfo(tunnel) {
  const infoPanel = document.getElementById('search-area'); // 왼쪽 패널 전체
  let infoDisplay = document.getElementById('tunnel-info-display');

  // 정보 표시 영역이 없으면 생성
  if (!infoDisplay) {
    infoDisplay = document.createElement('div');
    infoDisplay.id = 'tunnel-info-display';
    infoDisplay.style.marginTop = '20px';
    infoDisplay.style.paddingTop = '10px';
    infoDisplay.style.borderTop = '1px solid #eee';
    infoPanel.appendChild(infoDisplay);
  } else {
    infoDisplay.innerHTML = ''; // 기존 내용 초기화
  }

  if (tunnel) {
    infoDisplay.innerHTML = `
      <h3>${tunnel.name}</h3>
      <p><strong>완공 연도:</strong> ${tunnel.completionYear || '정보 없음'}</p>
      <p><strong>위도/경도:</strong> ${tunnel.lat}, ${tunnel.lng}</p>
      <p><strong>도로명 주소:</strong> ${tunnel.newJuso || '정보 없음'}</p>
      <p><strong>지번 주소:</strong> ${tunnel.juso || '정보 없음'}</p>
      <p><strong>총 길이:</strong> ${tunnel.length || '정보 없음'} m</p>
      <p><strong>총 폭:</strong> ${tunnel.totWidth || '정보 없음'} m</p>
      <p><strong>차로 수:</strong> ${tunnel.lineNum || '정보 없음'} 개</p>
      <p><strong>최종 점검일:</strong> ${tunnel.checkDate || '정보 없음'}</p>
      <p><strong>점검 등급:</strong> ${tunnel.grade || '정보 없음'}</p>
      <p><strong>관리 기관:</strong> ${tunnel.orgmNm || '정보 없음'}</p>
      <p><strong>기관 연락처:</strong> ${tunnel.orgmTel || '정보 없음'}</p>
    `;
  } else {
    infoDisplay.innerHTML = '<p>터널을 선택하거나 검색해주세요.</p>';
  }
}

// ===============================================
// 사이드바 크기 조절 기능 추가
// ===============================================
function setupResizer() {
  const searchArea = document.getElementById('search-area');
  const resizer = document.getElementById('resizer');
  let isResizing = false;
  let initialX;
  let initialWidth;

  const minWidth = 200; // 사이드바 최소 너비
  const maxWidth = 500; // 사이드바 최대 너비

  resizer.addEventListener('mousedown', function(e) {
    isResizing = true;
    initialX = e.clientX;
    initialWidth = searchArea.offsetWidth; // 현재 사이드바의 너비

    // 드래그 중 텍스트 선택 방지
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  });

  function handleMouseMove(e) {
    if (!isResizing) return;

    const dx = e.clientX - initialX; // 마우스 이동 거리
    let newWidth = initialWidth + dx;

    // 최소/최대 너비 제한 적용
    if (newWidth < minWidth) {
      newWidth = minWidth;
    } else if (newWidth > maxWidth) {
      newWidth = maxWidth;
    }

    searchArea.style.width = `${newWidth}px`;
    // 지도의 크기는 flex-grow에 의해 자동으로 조절됩니다.
  }

  function handleMouseUp() {
    isResizing = false;
    // 드래그 종료 후 스타일 초기화
    document.body.style.userSelect = '';
    document.body.style.cursor = ''; // 기본 커서로 되돌리기
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
}


// 지도 초기화 함수 호출
document.addEventListener('DOMContentLoaded', initMap);