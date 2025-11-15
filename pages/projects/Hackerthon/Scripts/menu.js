 document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".card");
  const nextBtn = document.querySelector(".next");
  const prevBtn = document.querySelector(".previous");
  let currentIndex = 2; // 중앙 카드로 시작

  function updateCards() {
    cards.forEach((card, idx) => {
      const numCards = cards.length;
      let offset = idx - currentIndex;

      // 카드가 반대편으로 넘어가는 것처럼 보이게 오프셋 조정
      if (offset > numCards / 2) {
        offset -= numCards;
      } else if (offset < -numCards / 2) {
        offset += numCards;
      }

      const absOffset = Math.abs(offset);

      card.style.transform = `
            translateX(${offset * 120}px)
            scale(${1 - absOffset * 0.1})
          `;
      card.style.zIndex = 100 - absOffset;

      // 선택 사항: 너무 멀리 있는 카드는 숨기기
      card.style.opacity = absOffset > (numCards - 1) / 2 ? 0 : 1;
      card.style.pointerEvents = absOffset > (numCards - 1) / 2 ? 'none' : 'auto';
    });
  }

  nextBtn.addEventListener("click", () => {
    // 다음 카드로 이동하며 배열의 끝에 도달하면 다시 처음으로
    currentIndex = (currentIndex + 1) % cards.length;
    updateCards();
  });

  prevBtn.addEventListener("click", () => {
    // 이전 카드로 이동하며 배열의 시작에 도달하면 다시 끝으로
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    updateCards();
  });

  updateCards(); // 페이지 로드 시 초기 카드 위치 설정
});
const langData = {
  KOR: {
    headline: "“더위엔 시원하게,추위엔 따뜻하게”",
    subtext: '"함께 만드는 쉼터 지도, 여러분의 후기가 모두의 여름과 겨울을 지켜줍니다."',
    cardText: [
      "무더위 쉼터 빨리 찾기",
      "쉽고 빠르게 날씨 보기",
      "교통 뉴스 보기"
    ],
    buttonText: "ENG"
  },
  ENG: {
    headline: "“Cool in heat, warm in cold”",
    subtext: "[ By building a map with your reviews, we protect everyone's summer and winter. ]",
    cardText: [
      "Find Cooling Centers Quickly",
      "Check the Weather Easily",
      "See Transportation News"
    ],
    buttonText: "KOR"
  }
};

let currentLang = "KOR";

document.getElementById("langToggle").addEventListener("click", () => {
  currentLang = currentLang === "KOR" ? "ENG" : "KOR";
  const lang = langData[currentLang];

  document.querySelector(".center h1").textContent = lang.headline;
  document.querySelector(".center h3").textContent = lang.subtext;

  const cardTexts = document.querySelectorAll(".card p");
  cardTexts.forEach((p, i) => {
    p.textContent = lang.cardText[i];
  });

  document.getElementById("langToggle").textContent = lang.buttonText;
  
});