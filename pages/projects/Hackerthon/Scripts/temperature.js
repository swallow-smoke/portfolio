// Scripts/temperature.js

async function fetchTemperatureData(lat, lng) {
    console.log(`[Temperature] fetching temperature for lat: ${lat}, lng: ${lng}`);

    const { nx, ny } = convertToGrid(lat, lng);
    console.log(`[Temperature] Converted to grid: nx=${nx}, ny=${ny}`);

    const today = new Date();
    let year = today.getFullYear();
    let month = String(today.getMonth() + 1).padStart(2, '0');
    let day = String(today.getDate()).padStart(2, '0');
    let base_date = `${year}${month}${day}`;

    let hours = today.getHours();
    let minutes = today.getMinutes();
    let base_time;

    // 기상청 초단기실황 API는 매시 30분 발표 (주기 10분)
    // 따라서 현재 시간 40분 이전의 가장 가까운 정시 데이터를 가져오는 것이 일반적입니다.
    if (minutes < 40) {
        hours = hours - 1;
        if (hours < 0) {
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

    console.log(`[Temperature] API Request Base Date: ${base_date}, Base Time: ${base_time}`);

    // ⭐️ 중요: 발급받은 실제 서비스 키로 변경하세요.
    // 이 키는 임시값이므로 본인의 키로 꼭 바꾸세요.
    const serviceKey = 'dkKrjHg4eN1Q5uXIP5TN+6hHPSlhPZQxGiL4mNBPJTZlE//0C/l4Gp8poVRGnEy0IZOAvzSkqirKaLfTHowsYA=='; 
    const apiUrl = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';

    const queryParams = new URLSearchParams({
        serviceKey: serviceKey,
        pageNo: '1',
        numOfRows: '10',
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
        console.log("[Temperature] Received XML:", xmlText);

        const jsonData = xmlToJson(xmlText);
        console.log("[Temperature] Converted JSON:", jsonData);

        // API 응답 구조에 따라 데이터를 파싱합니다.
        // `response` 상위 객체가 제거되었을 수 있으므로 직접 `body`부터 탐색합니다.
        const items = jsonData?.body?.items?.item;

        if (items && Array.isArray(items)) {
            const temperatureItem = items.find(item => item.category === 'T1H'); // T1H는 1시간 기온
            if (temperatureItem && temperatureItem.obsrValue !== undefined) {
                const temp = parseFloat(temperatureItem.obsrValue);
                console.log(`[Temperature] Actual temperature: ${temp}°C`);
                return temp; // 온도 값 반환
            } else {
                console.warn("[Temperature] 온도(T1H) 데이터를 찾을 수 없습니다. (카테고리 또는 obsrValue 누락)");
                return null;
            }
        } else {
            console.warn("[Temperature] API 응답에서 'items'를 찾을 수 없거나 형식이 올바르지 않습니다.");
            // 서비스 키 오류 응답 처리
            if (jsonData?.header?.returnReasonCode === '30' || jsonData?.cmmMsgHeader?.returnReasonCode === '30') {
                 console.error("[Temperature] API 서비스 키 오류: SERVICE_KEY_IS_NOT_REGISTERED_ERROR (에러 코드 30). 서비스 키 또는 API 활용 신청을 확인해주세요.");
                 alert("온도 데이터를 가져올 수 없습니다. 서비스 키 또는 API 활용 신청 상태를 확인하세요.");
            }
            return null;
        }

    } catch (error) {
        console.error("[Temperature] 온도 데이터를 가져오는 데 실패했습니다:", error);
        return null;
    }
}

// XML을 JSON으로 변환하는 함수 (mapSearch.js에서 옮겨옴)
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

// 위경도 -> 기상청 격자 좌표 변환 함수 (mapSearch.js에서 옮겨옴)
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