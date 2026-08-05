document.querySelectorAll(".music-data").forEach((dataElement) => {
  const container = dataElement.previousElementSibling;

  if (!container?.classList.contains("music-embed")) {
    return;
  }

  try {
    const data = JSON.parse(dataElement.textContent);

    if (data.youtube) {
      const iframe = document.createElement("iframe");

      iframe.width = "560";
      iframe.height = "315";
      iframe.src = `https://www.youtube.com/embed/${data.youtube}`;
      iframe.title = "YouTube";
      iframe.loading = "lazy";
      iframe.allowFullscreen = true;

      container.appendChild(iframe);
    }

    const labels = {
      lyrics: "作詞",
      music: "作曲",
      arrangement: "編曲",
      choreography: "振付"
    };

    const credits = Object.entries(labels)
      .filter(([key]) => data.credit?.[key])
      .map(([key, label]) => `${label}:${data.credit[key]}`);

    if (credits.length > 0) {
      const credit = document.createElement("small");
      credit.textContent = credits.join(", ");
      container.appendChild(credit);
    }
  } catch (error) {
    console.error("music-data のJSONを読み取れませんでした。", error);
  }
});
