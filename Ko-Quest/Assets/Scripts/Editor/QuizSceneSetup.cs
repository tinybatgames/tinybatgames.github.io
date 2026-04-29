using UnityEngine;
using UnityEditor;
using UnityEngine.UI;
using TMPro;

public class QuizSceneSetup : EditorWindow
{
    [MenuItem("Knight Online Quiz/Sahneyi Kur")]
    public static void SetupScene()
    {
        // Canvas
        GameObject canvasObj = new GameObject("Canvas");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasObj.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        canvasObj.GetComponent<CanvasScaler>().referenceResolution = new Vector2(1920, 1080);
        canvasObj.AddComponent<GraphicRaycaster>();

        // EventSystem
        if (Object.FindFirstObjectByType<UnityEngine.EventSystems.EventSystem>() == null)
        {
            GameObject eventSystem = new GameObject("EventSystem");
            eventSystem.AddComponent<UnityEngine.EventSystems.EventSystem>();
            eventSystem.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
        }

        // Background
        GameObject bg = CreatePanel(canvasObj.transform, "Background", new Color(0.08f, 0.08f, 0.15f));
        bg.GetComponent<RectTransform>().anchorMin = Vector2.zero;
        bg.GetComponent<RectTransform>().anchorMax = Vector2.one;
        bg.GetComponent<RectTransform>().sizeDelta = Vector2.zero;

        // ===== MAIN MENU PANEL =====
        GameObject mainMenu = CreatePanel(canvasObj.transform, "MainMenuPanel", new Color(0, 0, 0, 0));
        SetFullStretch(mainMenu);

        // Title
        CreateText(mainMenu.transform, "TitleText", "KNIGHT ONLINE\nBILGI YARISMASI",
            new Vector2(0, 150), 52, FontStyle.Bold, new Color(1f, 0.84f, 0f));

        // Subtitle
        CreateText(mainMenu.transform, "SubtitleText", "Bilgini test et!",
            new Vector2(0, 50), 28, FontStyle.Normal, Color.white);

        // Start Button
        GameObject startBtn = CreateButton(mainMenu.transform, "StartButton", "BASLA",
            new Vector2(0, -50), new Vector2(300, 60), new Color(0.2f, 0.7f, 0.3f));

        // Category Button
        GameObject catBtn = CreateButton(mainMenu.transform, "CategoryButton", "KATEGORI SEC",
            new Vector2(0, -130), new Vector2(300, 60), new Color(0.2f, 0.4f, 0.8f));

        // Quit Button
        GameObject quitBtn = CreateButton(mainMenu.transform, "QuitButton", "CIKIS",
            new Vector2(0, -210), new Vector2(300, 60), new Color(0.8f, 0.2f, 0.2f));

        // ===== QUIZ PANEL =====
        GameObject quizPanel = CreatePanel(canvasObj.transform, "QuizPanel", new Color(0, 0, 0, 0));
        SetFullStretch(quizPanel);
        quizPanel.SetActive(false);

        // Top bar
        GameObject categoryLabel = CreateText(quizPanel.transform, "CategoryText", "Kategori",
            new Vector2(-300, 470), 24, FontStyle.Normal, new Color(1f, 0.84f, 0f)).gameObject;

        GameObject questionCount = CreateText(quizPanel.transform, "QuestionCountText", "Soru 1/10",
            new Vector2(0, 470), 24, FontStyle.Normal, Color.white).gameObject;

        GameObject scoreLabel = CreateText(quizPanel.transform, "ScoreText", "Skor: 0",
            new Vector2(300, 470), 24, FontStyle.Normal, new Color(0.2f, 0.8f, 0.2f)).gameObject;

        // Question
        CreateText(quizPanel.transform, "QuestionText",
            "Soru metni burada gorunecek?",
            new Vector2(0, 250), 32, FontStyle.Bold, Color.white);

        // Option Buttons
        string[] optionLabels = { "A) Secenek 1", "B) Secenek 2", "C) Secenek 3", "D) Secenek 4" };
        GameObject[] optBtns = new GameObject[4];
        TextMeshProUGUI[] optTexts = new TextMeshProUGUI[4];

        for (int i = 0; i < 4; i++)
        {
            float yPos = 50 - (i * 90);
            optBtns[i] = CreateButton(quizPanel.transform, $"OptionButton_{i}", optionLabels[i],
                new Vector2(0, yPos), new Vector2(800, 70), new Color(0.2f, 0.4f, 0.8f));
            optTexts[i] = optBtns[i].GetComponentInChildren<TextMeshProUGUI>();
        }

        // ===== RESULT PANEL =====
        GameObject resultPanel = CreatePanel(canvasObj.transform, "ResultPanel", new Color(0, 0, 0, 0));
        SetFullStretch(resultPanel);
        resultPanel.SetActive(false);

        CreateText(resultPanel.transform, "ResultTitleText", "Oyun Bitti!",
            new Vector2(0, 200), 48, FontStyle.Bold, new Color(1f, 0.84f, 0f));

        CreateText(resultPanel.transform, "ResultScoreText", "8 / 10",
            new Vector2(0, 80), 64, FontStyle.Bold, Color.white);

        CreateText(resultPanel.transform, "ResultMessageText", "Harika! Knight Online bilgin cok iyi!",
            new Vector2(0, -20), 28, FontStyle.Normal, new Color(0.7f, 0.9f, 0.7f));

        GameObject restartBtn = CreateButton(resultPanel.transform, "RestartButton", "TEKRAR OYNA",
            new Vector2(0, -130), new Vector2(300, 60), new Color(0.2f, 0.7f, 0.3f));

        GameObject menuBtn = CreateButton(resultPanel.transform, "MainMenuButton", "ANA MENU",
            new Vector2(0, -210), new Vector2(300, 60), new Color(0.2f, 0.4f, 0.8f));

        // ===== CATEGORY PANEL =====
        GameObject catPanel = CreatePanel(canvasObj.transform, "CategoryPanel", new Color(0, 0, 0, 0));
        SetFullStretch(catPanel);
        catPanel.SetActive(false);

        CreateText(catPanel.transform, "CategoryTitleText", "Kategori Sec",
            new Vector2(0, 350), 42, FontStyle.Bold, new Color(1f, 0.84f, 0f));

        // Category button container with vertical layout
        GameObject catContainer = new GameObject("CategoryButtonContainer");
        catContainer.transform.SetParent(catPanel.transform, false);
        RectTransform catContainerRect = catContainer.AddComponent<RectTransform>();
        catContainerRect.anchoredPosition = new Vector2(0, 50);
        catContainerRect.sizeDelta = new Vector2(400, 400);
        VerticalLayoutGroup vlg = catContainer.AddComponent<VerticalLayoutGroup>();
        vlg.spacing = 15;
        vlg.childAlignment = TextAnchor.UpperCenter;
        vlg.childForceExpandWidth = true;
        vlg.childForceExpandHeight = false;
        ContentSizeFitter csf = catContainer.AddComponent<ContentSizeFitter>();
        csf.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

        // Category button prefab (hidden)
        GameObject catBtnPrefab = CreateButton(catContainer.transform, "CategoryButtonPrefab", "Kategori",
            Vector2.zero, new Vector2(300, 55), new Color(0.3f, 0.3f, 0.6f));
        LayoutElement le = catBtnPrefab.AddComponent<LayoutElement>();
        le.preferredHeight = 55;
        le.preferredWidth = 300;
        catBtnPrefab.SetActive(false);

        // Back button
        GameObject catBackBtn = CreateButton(catPanel.transform, "CategoryBackButton", "GERI",
            new Vector2(0, -300), new Vector2(200, 50), new Color(0.6f, 0.3f, 0.3f));

        // ===== GAME MANAGER =====
        GameObject gameManager = new GameObject("GameManager");
        QuizManager qm = gameManager.AddComponent<QuizManager>();

        UIManager ui = gameManager.AddComponent<UIManager>();

        // Assign references via SerializedObject
        SerializedObject uiSO = new SerializedObject(ui);

        uiSO.FindProperty("mainMenuPanel").objectReferenceValue = mainMenu;
        uiSO.FindProperty("quizPanel").objectReferenceValue = quizPanel;
        uiSO.FindProperty("resultPanel").objectReferenceValue = resultPanel;
        uiSO.FindProperty("categoryPanel").objectReferenceValue = catPanel;

        uiSO.FindProperty("startButton").objectReferenceValue = startBtn.GetComponent<Button>();
        uiSO.FindProperty("categoryButton").objectReferenceValue = catBtn.GetComponent<Button>();
        uiSO.FindProperty("quitButton").objectReferenceValue = quitBtn.GetComponent<Button>();

        uiSO.FindProperty("questionText").objectReferenceValue = quizPanel.transform.Find("QuestionText").GetComponent<TextMeshProUGUI>();
        uiSO.FindProperty("categoryText").objectReferenceValue = categoryLabel.GetComponent<TextMeshProUGUI>();
        uiSO.FindProperty("questionCountText").objectReferenceValue = questionCount.GetComponent<TextMeshProUGUI>();
        uiSO.FindProperty("scoreText").objectReferenceValue = scoreLabel.GetComponent<TextMeshProUGUI>();

        // Option buttons array
        SerializedProperty optBtnsProp = uiSO.FindProperty("optionButtons");
        optBtnsProp.arraySize = 4;
        SerializedProperty optTxtsProp = uiSO.FindProperty("optionTexts");
        optTxtsProp.arraySize = 4;
        for (int i = 0; i < 4; i++)
        {
            optBtnsProp.GetArrayElementAtIndex(i).objectReferenceValue = optBtns[i].GetComponent<Button>();
            optTxtsProp.GetArrayElementAtIndex(i).objectReferenceValue = optTexts[i];
        }

        uiSO.FindProperty("resultTitleText").objectReferenceValue = resultPanel.transform.Find("ResultTitleText").GetComponent<TextMeshProUGUI>();
        uiSO.FindProperty("resultScoreText").objectReferenceValue = resultPanel.transform.Find("ResultScoreText").GetComponent<TextMeshProUGUI>();
        uiSO.FindProperty("resultMessageText").objectReferenceValue = resultPanel.transform.Find("ResultMessageText").GetComponent<TextMeshProUGUI>();
        uiSO.FindProperty("restartButton").objectReferenceValue = restartBtn.GetComponent<Button>();
        uiSO.FindProperty("mainMenuButton").objectReferenceValue = menuBtn.GetComponent<Button>();

        uiSO.FindProperty("categoryButtonContainer").objectReferenceValue = catContainer.transform;
        uiSO.FindProperty("categoryButtonPrefab").objectReferenceValue = catBtnPrefab.GetComponent<Button>();
        uiSO.FindProperty("categoryBackButton").objectReferenceValue = catBackBtn.GetComponent<Button>();

        uiSO.ApplyModifiedProperties();

        Debug.Log("Knight Online Quiz sahnesi basariyla kuruldu!");
        EditorUtility.DisplayDialog("Basarili!", "Knight Online Quiz sahnesi kuruldu.\nPlay tusuna basarak test edebilirsiniz.", "Tamam");
    }

    private static GameObject CreatePanel(Transform parent, string name, Color color)
    {
        GameObject panel = new GameObject(name);
        panel.transform.SetParent(parent, false);
        RectTransform rect = panel.AddComponent<RectTransform>();
        Image img = panel.AddComponent<Image>();
        img.color = color;
        return panel;
    }

    private static void SetFullStretch(GameObject obj)
    {
        RectTransform rect = obj.GetComponent<RectTransform>();
        rect.anchorMin = Vector2.zero;
        rect.anchorMax = Vector2.one;
        rect.sizeDelta = Vector2.zero;
        rect.anchoredPosition = Vector2.zero;
        // Make transparent so children are visible
        obj.GetComponent<Image>().color = new Color(0, 0, 0, 0);
    }

    private static TextMeshProUGUI CreateText(Transform parent, string name, string text,
        Vector2 position, int fontSize, FontStyle style, Color color)
    {
        GameObject textObj = new GameObject(name);
        textObj.transform.SetParent(parent, false);
        RectTransform rect = textObj.AddComponent<RectTransform>();
        rect.anchoredPosition = position;
        rect.sizeDelta = new Vector2(1000, 100);

        TextMeshProUGUI tmp = textObj.AddComponent<TextMeshProUGUI>();
        tmp.text = text;
        tmp.fontSize = fontSize;
        tmp.fontStyle = style == FontStyle.Bold ? TMPro.FontStyles.Bold : TMPro.FontStyles.Normal;
        tmp.color = color;
        tmp.alignment = TextAlignmentOptions.Center;
        tmp.enableWordWrapping = true;

        return tmp;
    }

    private static GameObject CreateButton(Transform parent, string name, string text,
        Vector2 position, Vector2 size, Color color)
    {
        GameObject btnObj = new GameObject(name);
        btnObj.transform.SetParent(parent, false);
        RectTransform rect = btnObj.AddComponent<RectTransform>();
        rect.anchoredPosition = position;
        rect.sizeDelta = size;

        Image img = btnObj.AddComponent<Image>();
        img.color = color;

        Button btn = btnObj.AddComponent<Button>();
        ColorBlock cb = btn.colors;
        cb.highlightedColor = new Color(color.r + 0.1f, color.g + 0.1f, color.b + 0.1f);
        cb.pressedColor = new Color(color.r - 0.1f, color.g - 0.1f, color.b - 0.1f);
        btn.colors = cb;

        // Button text
        GameObject textObj = new GameObject("Text");
        textObj.transform.SetParent(btnObj.transform, false);
        RectTransform textRect = textObj.AddComponent<RectTransform>();
        textRect.anchorMin = Vector2.zero;
        textRect.anchorMax = Vector2.one;
        textRect.sizeDelta = Vector2.zero;

        TextMeshProUGUI tmp = textObj.AddComponent<TextMeshProUGUI>();
        tmp.text = text;
        tmp.fontSize = 24;
        tmp.fontStyle = TMPro.FontStyles.Bold;
        tmp.color = Color.white;
        tmp.alignment = TextAlignmentOptions.Center;

        return btnObj;
    }
}
