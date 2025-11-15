let map;
let userLat = 37.5665; // 기본 위치: 서울시청 (초기값)
let userLng = 126.9780; // 기본 위치: 서울시청 (초기값)
let userCircle = null;
let userMarker = null;
let userRadius = 5000; // 기본 반경 5km (HTML select의 기본값과 일치)
let shelterMarkers = []; // 모든 쉼터 마커를 저장할 배열
let currentTemperature = null; // ⭐️ 중요: 초기에는 null로 설정하고, API 호출 성공 시 값을 할당합니다.

function initMap() {
    // ⭐️ 위치 정보 가져오기 시작
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(

            (position) => {
                // 위치 정보 획득 성공 시 userLat, userLng 업데이트
                userLat = position.coords.latitude;
                userLng = position.coords.longitude;
                console.log(`사용자 현재 위치: Lat ${userLat}, Lng ${userLng}`);
                initializeMapAndData();
            },
            (error) => {
                // 위치 정보 획득 실패 시 기본 위치 사용
                console.warn("위치 정보를 가져올 수 없습니다. 기본 위치(서울시청)로 설정합니다.", error);
                initializeMapAndData(); // 기본 위치로 지도 및 데이터 로드
            }
        );
    } else {
        alert("브라우저가 위치 정보를 지원하지 않습니다. 기본 위치로 지도를 로드합니다.");
        initializeMapAndData(); // 지원하지 않을 경우에도 기본 위치로 지도 및 데이터 로드
    }
}

function initializeMapAndData() {
    // 지도를 초기화합니다.
    map = new naver.maps.Map("map", {
        center: new naver.maps.LatLng(userLat, userLng),
        zoom: 14
    });

    setupRadiusSelector();
    setupResizer();
    drawUserMarker(); // 사용자 마커 그리기

    // ⭐️ 중요: fetchTemperatureData는 비동기 함수이므로 Promise를 기다려야 합니다.
    // 온도 데이터를 먼저 가져온 후, 지도 원과 온도 정보를 업데이트합니다.
    fetchTemperatureData(userLat, userLng).then(() => {
        drawUserRadius(); // 온도 정보 기반으로 원 그리기
        updateTemperatureInfo(); // 온도 정보 표시 업데이트
    }).catch(error => {
        console.error("초기 온도 데이터 로딩 실패:", error);
        // 온도 로딩 실패 시에도 지도 원을 기본 색상으로 그립니다.
        drawUserRadius();
        updateTemperatureInfo();
    });

    loadShelters(); // 쉼터 데이터 로드
}

function setupRadiusSelector() {
    const controlArea = document.getElementById("radius-control");
    if (!controlArea) return;

    controlArea.innerHTML = `
        <label style="font-weight:bold">반경 설정 (km): </label>
        <select id="radius-select">
            <option value="1">1km</option>
            <option value="2">2km</option>
            <option value="3">3km</option>
            <option value="5" selected>5km</option>
        </select>
    `;

    const select = document.getElementById("radius-select");
    select.addEventListener("change", () => {
        userRadius = parseFloat(select.value) * 1000;
        drawUserRadius();
        updateShelterMarkers();
    });
}

function updateTemperatureInfo() {
    const tempInfoDiv = document.getElementById('temperature-info');
    if (tempInfoDiv) {
        console.log(currentTemperature);
        if (currentTemperature !== null) {
            tempInfoDiv.innerHTML = `현재 지역 온도: <span style="color: ${getCircleColor(currentTemperature)}; font-size: 1.1em; font-weight: bold;">${currentTemperature}°C</span>`;
        } else {
            tempInfoDiv.innerHTML = `현재 온도 정보를 가져올 수 없습니다.`;

        }
    }
}

function getCircleColor(temperature) {
    if (temperature > 28) {
        return '#ff0000'; // 빨간색 (28도 초과)
    } else if (temperature > 20) {
        return '#ffa500'; // 주황색 (20도 초과)
    } else {
        return '#0076ff'; // 파란색 (20도 이하)
    }
}

// ⭐️ fetchTemperatureData 함수를 수정하여 실제 API 데이터를 가져오고 반환하도록 합니다.
async function fetchTemperatureData(lat, lng) {
    console.log(`fetching temperature for lat: ${lat}, lng: ${lng}`);

    // 기상청 API는 격자 좌표(XY)를 사용하므로, 위경도(LatLng)를 격자 좌표로 변환해야 합니다.
    const { nx, ny } = convertToGrid(lat, lng);
    console.log(`Converted to grid: nx=${nx}, ny=${ny}`);

    // 현재 날짜와 시간 계산
    const today = new Date();
    let year = today.getFullYear();
    let month = String(today.getMonth() + 1).padStart(2, '0');
    let day = String(today.getDate()).padStart(2, '0');
    let base_date = `${year}${month}${day}`;

    let hours = today.getHours();
    let minutes = today.getMinutes();
    let base_time;

    // 기상청 초단기실황 API는 매시 30분 발표 (주기 10분)
    // 현재 시간으로부터 40분 이전의 가장 가까운 정시 데이터를 가져옵니다.
    // 예: 현재 22:42 (22시 40분 이후) -> base_time은 2200
    // 예: 현재 22:20 (22시 40분 이전) -> base_time은 2100 (이전 시간)
    if (minutes < 40) {
        hours = hours - 1;
        if (hours < 0) { // 자정을 넘어갈 경우 (예: 00시 30분 이전 -> 전날 23시)
            hours = 23;
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            year = yesterday.getFullYear();
            month = String(yesterday.getMonth() + 1).padStart(2, '0');
            day = String(yesterday.getDate()).padStart(2, '0');
            base_date = `${year}${month}${day}`;
        }
    }
    base_time = String(hours).padStart(2, '0') + '00';

    console.log(`API 요청 Base Date: ${base_date}, Base Time: ${base_time}`);

    const serviceKey = 'dkKrjHg4eN1Q5uXIP5TN+6hHPSlhPZQxGiL4mNBPJTZlE//0C/l4Gp8poVRGnEy0IZOAvzSkqirKaLfTHowsYA=='; // 서비스 키
    const apiUrl = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst'; // API URL

    const queryParams = new URLSearchParams({
        serviceKey: serviceKey,
        pageNo: '1',
        numOfRows: '10', // 온도 데이터만 필요하므로 10개면 충분합니다.
        dataType: 'XML',
        base_date: base_date,
        base_time: base_time,
        nx: nx,
        ny: ny
    }).toString();

    try {
        const response = await fetch(`${apiUrl}?${queryParams}`);

        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태 코드: ${response.status}`);
        }

        const xmlText = await response.text();
        console.log("받은 XML:", xmlText);

        const jsonData = xmlToJson(xmlText); // XML을 JSON으로 변환
        console.log("변환된 JSON:", jsonData);

        console.log('#3', jsonData)
        const items = jsonData?.body?.items?.item;

        console.log('#2', items)
        if (items && Array.isArray(items)) {
            const temperatureItem = items.find(item => item.category === 'T1H'); // T1H는 1시간 기온
            console.log('#1', temperatureItem)
            if (temperatureItem && temperatureItem.obsrValue !== undefined) {
                
                currentTemperature = parseFloat(temperatureItem.obsrValue); // 전역 변수 currentTemperature 업데이트
                console.log(`실제 온도: ${currentTemperature}°C`);
                return currentTemperature; // 온도 값 반환
            } else {
                console.warn("온도(T1H) 데이터를 찾을 수 없습니다. (카테고리 또는 obsrValue 누락)");
                currentTemperature = null;
                return null;
            }
        } else {
            console.warn("API 응답에서 'items'를 찾을 수 없거나 형식이 올바르지 않습니다.");
            currentTemperature = null;
            return null;
        }

    } catch (error) {
        console.error("온도 데이터를 가져오는 데 실패했습니다:", error);
        currentTemperature = null;
        return null;
    }
}

// ⭐️ XML을 JSON으로 변환하는 함수 (제공된 코드)
function xmlToJson(xml) {
    let xmlDoc;

    if (typeof xml === 'string') {
        const parser = new DOMParser();
        xmlDoc = parser.parseFromString(xml, "application/xml");

        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
            console.error("Error parsing XML string:", errorNode.textContent);
            return null;
        }
    } else if (xml instanceof Document) {
        xmlDoc = xml;
    } else {
        console.error("Invalid input: Expected an XML string or an XML Document object.");
        return null;
    }

    function convertNode(node) {
        let obj = {};

        if (node.nodeType === 1) { // Element node
            if (node.attributes.length > 0) {
                obj["@attributes"] = {};
                for (let j = 0; j < node.attributes.length; j++) {
                    let attribute = node.attributes.item(j);
                    obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                }
            }

            if (node.hasChildNodes()) {
                for (let i = 0; i < node.childNodes.length; i++) {
                    let item = node.childNodes.item(i);
                    let nodeName = item.nodeName;

                    if (item.nodeType === 3 && item.nodeValue.trim() === '') {
                        continue;
                    }

                    if (typeof (obj[nodeName]) === "undefined") {
                        obj[nodeName] = convertNode(item);
                    } else {
                        if (typeof (obj[nodeName].push) === "undefined") {
                            let old = obj[nodeName];
                            obj[nodeName] = [];
                            obj[nodeName].push(old);
                        }
                        obj[nodeName].push(convertNode(item));
                    }
                }
            }
        } else if (node.nodeType === 3) { // Text node
            return node.nodeValue.trim();
        } else if (node.nodeType === 8) { // Comment node
            return null;
        }

        if (Object.keys(obj).length === 0 && obj.constructor === Object && node.nodeType === 1 && !node.hasChildNodes() && !node.attributes.length) {
            return null;
        }

        if (Object.keys(obj).length === 1 && typeof obj['#text'] === 'string' && !obj['@attributes']) {
            return obj['#text'];
        }

        return obj;
    }

    for (let i = 0; i < xmlDoc.childNodes.length; i++) {
        if (xmlDoc.childNodes[i].nodeType === 1) {
            return convertNode(xmlDoc.childNodes[i]);
        }
    }
    return {};
}

// ⭐️ 위경도 -> 기상청 격자 좌표 변환 함수 (필수)
// 기상청에서 제공하는 예시 변환 코드 중 일부를 간략화한 것입니다.
// 더 정밀한 변환이 필요하면 기상청 API 문서를 참고하세요.
function convertToGrid(lat, lon) {
    const RE = 6371.00877; // 지구 반경 (km)
    const GRID = 5.0; // 격자 간격 (km)
    const SLAT1 = 30.0; // 투영 위도1 (degree)
    const SLAT2 = 60.0; // 투영 위도2 (degree)
    const OLON = 126.0; // 기준점 경도 (degree)
    const OLAT = 38.0; // 기준점 위도 (degree)
    const XO = 43; // 기준점 X좌표 (grid)
    const YO = 136; // 기준점 Y좌표 (grid)

    const DEGRAD = Math.PI / 180.0;

    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD;
    const slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD;
    const olat = OLAT * DEGRAD;

    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = re * sf / Math.pow(ro, sn);

    let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
    ra = re * sf / Math.pow(ra, sn);
    let theta = lon * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;

    const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
    const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

    return { nx, ny };
}

function drawUserRadius() {
    if (userCircle) {
        userCircle.setMap(null);
    }

    let circleColor = '#0076ff'; // 기본 파란색 (20도 이하)

    if (currentTemperature !== null) {
        circleColor = getCircleColor(currentTemperature);
    } else {
        console.warn("온도 데이터를 가져올 수 없어 기본 색상(파란색)을 사용합니다.");
    }

    userCircle = new naver.maps.Circle({
        map: map,
        center: new naver.maps.LatLng(userLat, userLng),
        radius: userRadius,
        strokeColor: circleColor,
        strokeOpacity: 0.5,
        strokeWeight: 2,
        fillColor: circleColor,
        fillOpacity: 0.15
    });
}

function drawUserMarker() {
    if (userMarker) {
        userMarker.setMap(null);
    }
    userMarker = new naver.maps.Marker({
        position: new naver.maps.LatLng(userLat, userLng),
        map: map,
        icon: {
            content: '<div style="background:#ff4444;padding:6px 10px;border-radius:8px;font-weight:bold;font-size:14px;box-shadow:0 0 8px rgba(0,0,0,0.3);color:#fff;">📍 내 위치</div>',
            size: new naver.maps.Size(30, 30),
            anchor: new naver.maps.Point(15, 15)
        },
        zIndex: 1000
    });
}

function loadShelters() {
    // `structure.DATA`는 HTML 파일에서 전역 변수로 정의되어 있거나,
    // JSON 파일을 별도로 fetch해서 사용해야 합니다.
    // 여기서는 `structure.DATA`가 있다고 가정하고, 없으면 fetch를 시도합니다.
    if (typeof structure !== 'undefined' && structure.DATA) {
        processShelterData(structure.DATA);
    } else {
        console.warn("전역 변수 'structure.DATA'를 찾을 수 없습니다. './Assets/Structures.json'에서 데이터를 불러옵니다.");
        fetch('./Assets/Structures.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('쉼터 데이터를 불러올 수 없습니다.');
                }
                return response.json();
            })
            .then(json => {
                const data = json.DATA;
                processShelterData(data);
            })
            .catch(error => {
                console.error('쉼터 데이터 로딩 중 오류가 발생했습니다:', error);
                alert('쉼터 데이터 로딩 중 오류가 발생했습니다.');
            });
    }
}

function processShelterData(data) {
    if (!Array.isArray(data)) {
        alert('쉼터 데이터 형식이 올바르지 않습니다.');
        return;
    }

    clearShelterMarkers();

    data.forEach(item => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const name = item.r_area_nm;
        const address = item.r_detl_add;
        const phone = item.r_tel_no;
        const type = item.r_place_type;

        if (!isNaN(lat) && !isNaN(lng)) {
            const distance = getDistanceFromLatLonInKm(userLat, userLng, lat, lng);
            if (distance <= userRadius / 1000) {
                const marker = new naver.maps.Marker({
                    position: new naver.maps.LatLng(lat, lng),
                    map: map,
                    title: name || '무더위 쉼터',
                    animation: naver.maps.Animation.DROP
                });

                naver.maps.Event.addListener(marker, "click", function () {
                    displayShelterInfo({ name, address, phone, type });
                });
                shelterMarkers.push({ marker, lat, lng, name, address, phone, type });
            }
        }
    });
}

function clearShelterMarkers() {
    shelterMarkers.forEach(item => {
        item.marker.setMap(null);
    });
    shelterMarkers = [];
}

function updateShelterMarkers() {
    shelterMarkers.forEach(item => {
        const distance = getDistanceFromLatLonInKm(userLat, userLng, item.lat, item.lng);
        if (distance <= userRadius / 1000) {
            item.marker.setMap(map);
        } else {
            item.marker.setMap(null);
        }
    });
}

function displayShelterInfo({ name, address, phone, type }) {
    const infoBox = document.getElementById('search-results');
    infoBox.innerHTML = `
        <div style="padding: 15px;">
            <h2 style="margin-bottom:10px;">${name || '무더위 쉼터'}</h2>
            <p><strong>주소:</strong> ${address || '정보 없음'}</p>
            <p><strong>전화번호:</strong> ${phone || '정보 없음'}</p>
            <p><strong>유형:</strong> ${type || '정보 없음'}</p>
        </div>
    `;
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function setupResizer() {
    const searchArea = document.getElementById('search-area');
    const mapElement = document.getElementById('map');
    const resizer = document.getElementById('resizer');
    let isResizing = false;
    let initialX;
    let initialWidth;
    let initialMapLeft;

    const minWidth = 300;

    resizer.addEventListener('mousedown', function (e) {
        isResizing = true;
        initialX = e.clientX;
        initialWidth = searchArea.offsetWidth;
        initialMapLeft = mapElement.offsetLeft;

        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ew-resize';

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    function handleMouseMove(e) {
        if (!isResizing) return;

        const dx = e.clientX - initialX;
        let newWidth = initialWidth + dx;

        if (newWidth < minWidth) {
            newWidth = minWidth;
        }
        if (newWidth > window.innerWidth * 0.5) {
            newWidth = window.innerWidth * 0.5;
        }

        searchArea.style.width = `${newWidth}px`;
        mapElement.style.left = `${newWidth}px`;
    }

    function handleMouseUp() {
        isResizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }
}

document.addEventListener('DOMContentLoaded', initMap);