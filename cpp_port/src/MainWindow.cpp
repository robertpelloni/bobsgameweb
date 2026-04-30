#include "MainWindow.h"
#include <QTabWidget>
#include <QWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGridLayout>
#include <QLabel>
#include <QPushButton>
#include <QLineEdit>
#include <QComboBox>
#include <QCheckBox>
#include <QGroupBox>

// Ultimate++ (U++) conceptual design pattern:
// We use QGroupBoxes to emulate the U++ "Ctrl" / Panel layout encapsulation
// mirroring the exact UI we built in PIXI native canvas for Web/Electron.

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
{
    setupUi();
}

MainWindow::~MainWindow() {}

void MainWindow::setupUi() {
    this->setWindowTitle("bgeditor - Omni-Engine (C++ / Qt6 Port)");
    this->resize(1280, 800);

    tabWidget = new QTabWidget(this);
    this->setCentralWidget(tabWidget);

    // ============================================
    // 1. Setup Custom Game Editor Tab (Mirroring PIXI)
    // ============================================
    QWidget *customGameTab = new QWidget();
    QHBoxLayout *mainGameLayout = new QHBoxLayout(customGameTab);

    // Left Column (Settings & Palettes)
    QVBoxLayout *leftCol = new QVBoxLayout();

    // Game Name Panel
    QGroupBox *nameGroup = new QGroupBox("Game Name");
    QVBoxLayout *nameLayout = new QVBoxLayout();
    QLineEdit *nameInput = new QLineEdit("Enter Game Name");
    nameLayout->addWidget(nameInput);
    nameGroup->setLayout(nameLayout);
    leftCol->addWidget(nameGroup);

    // Generative AI Panel
    QGroupBox *aiGroup = new QGroupBox("Generative AI Tools");
    QHBoxLayout *aiLayout = new QHBoxLayout();
    QPushButton *btnGenSprite = new QPushButton("Text-to-Sprite");
    QPushButton *btnGenTile = new QPushButton("Text-to-Tileset");
    aiLayout->addWidget(btnGenSprite);
    aiLayout->addWidget(btnGenTile);
    aiGroup->setLayout(aiLayout);
    leftCol->addWidget(aiGroup);

    // Settings Panel
    QGroupBox *settingsGroup = new QGroupBox("Game Settings");
    QGridLayout *settingsLayout = new QGridLayout();
    settingsLayout->addWidget(new QLabel("Game Mode"), 0, 0);
    QComboBox *modeCombo = new QComboBox();
    modeCombo->addItems({"Classic Drop", "Stacking", "Matching"});
    settingsLayout->addWidget(modeCombo, 0, 1);

    settingsLayout->addWidget(new QLabel("Grid Width"), 1, 0);
    settingsLayout->addWidget(new QLineEdit("10"), 1, 1);
    settingsLayout->addWidget(new QLabel("Grid Height"), 1, 2);
    settingsLayout->addWidget(new QLineEdit("20"), 1, 3);

    settingsLayout->addWidget(new QLabel("Gravity Base"), 2, 0);
    settingsLayout->addWidget(new QLineEdit("1.0"), 2, 1);
    settingsLayout->addWidget(new QLabel("Lock Delay"), 2, 2);
    settingsLayout->addWidget(new QLineEdit("30"), 2, 3);

    settingsGroup->setLayout(settingsLayout);
    leftCol->addWidget(settingsGroup);

    // Unified Template Library Panel
    QGroupBox *libGroup = new QGroupBox("Unified Template Library Search");
    QHBoxLayout *libLayout = new QHBoxLayout();
    QLineEdit *libSearch = new QLineEdit("Search templates...");
    libLayout->addWidget(libSearch);
    libLayout->addWidget(new QPushButton("All Sources"));
    libLayout->addWidget(new QPushButton("Built-In"));
    libLayout->addWidget(new QPushButton("Slots"));
    libLayout->addWidget(new QPushButton("History"));
    libGroup->setLayout(libLayout);
    leftCol->addWidget(libGroup);

    leftCol->addStretch();
    mainGameLayout->addLayout(leftCol, 2);

    // Right Column (Toggles & Pieces)
    QVBoxLayout *rightCol = new QVBoxLayout();

    // Action Panel
    QGroupBox *actionGroup = new QGroupBox("Actions & Slots");
    QGridLayout *actionLayout = new QGridLayout();
    actionLayout->addWidget(new QPushButton("Save 1"), 0, 0);
    actionLayout->addWidget(new QPushButton("Load 1"), 0, 1);
    actionLayout->addWidget(new QPushButton("Save 2"), 1, 0);
    actionLayout->addWidget(new QPushButton("Load 2"), 1, 1);
    actionGroup->setLayout(actionLayout);
    rightCol->addWidget(actionGroup);

    // Block / Piece Properties
    QGroupBox *blockGroup = new QGroupBox("Block Properties");
    QGridLayout *blockLayout = new QGridLayout();
    blockLayout->addWidget(new QLabel("Block Name"), 0, 0);
    blockLayout->addWidget(new QLineEdit("New Block"), 0, 1);
    blockLayout->addWidget(new QLabel("Color"), 1, 0);
    blockLayout->addWidget(new QLineEdit("#RRGGBB"), 1, 1);

    blockLayout->addWidget(new QCheckBox("Use in normal pieces"), 2, 0, 1, 2);
    blockLayout->addWidget(new QCheckBox("Use as garbage"), 3, 0, 1, 2);
    blockGroup->setLayout(blockLayout);
    rightCol->addWidget(blockGroup);

    // Game Toggles
    QGroupBox *toggleGroup = new QGroupBox("Game Mechanics Toggles");
    QGridLayout *toggleLayout = new QGridLayout();
    toggleLayout->addWidget(new QCheckBox("Cascade Gravity"), 0, 0);
    toggleLayout->addWidget(new QCheckBox("Move Disconnected"), 0, 1);
    toggleLayout->addWidget(new QCheckBox("Chain Checks Rows"), 1, 0);
    toggleLayout->addWidget(new QCheckBox("Show Next Pieces"), 1, 1);
    toggleGroup->setLayout(toggleLayout);
    rightCol->addWidget(toggleGroup);

    rightCol->addStretch();
    mainGameLayout->addLayout(rightCol, 1);

    tabWidget->addTab(customGameTab, "Custom Game Editor");

    // ============================================
    // 2. Setup World Editor Tab
    // ============================================
    QWidget *worldEditorTab = new QWidget();
    QVBoxLayout *worldEditorLayout = new QVBoxLayout(worldEditorTab);
    worldEditorLayout->addWidget(new QLabel("World Editor (RPG Event Sheet)...", worldEditorTab));
    worldEditorLayout->addWidget(new QPushButton("Open Visual Event Sheet", worldEditorTab));
    worldEditorLayout->addStretch();
    tabWidget->addTab(worldEditorTab, "World Editor");

    // ============================================
    // 3. Setup Timeline / Animations Tab
    // ============================================
    QWidget *timelineTab = new QWidget();
    QVBoxLayout *timelineLayout = new QVBoxLayout(timelineTab);
    timelineLayout->addWidget(new QLabel("Animation Timeline Track Editor", timelineTab));
    timelineLayout->addWidget(new QPushButton("Play Animation", timelineTab));
    timelineLayout->addStretch();
    tabWidget->addTab(timelineTab, "Timeline Editor");
}
