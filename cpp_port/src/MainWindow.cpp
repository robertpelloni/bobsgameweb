#include "MainWindow.h"
#include <QTabWidget>
#include <QWidget>
#include <QVBoxLayout>
#include <QLabel>
#include <QPushButton>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
{
    setupUi();
}

MainWindow::~MainWindow() {}

void MainWindow::setupUi() {
    this->setWindowTitle("bgeditor - Omni-Engine (C++ Port)");
    this->resize(1024, 768);

    tabWidget = new QTabWidget(this);
    this->setCentralWidget(tabWidget);

    // Setup Custom Game Editor Tab
    QWidget *customGameTab = new QWidget();
    QVBoxLayout *customGameLayout = new QVBoxLayout(customGameTab);

    QLabel *customGameLabel = new QLabel("Custom Game Editor Settings...", customGameTab);
    QPushButton *btnSave = new QPushButton("Save Custom Game", customGameTab);

    customGameLayout->addWidget(customGameLabel);
    customGameLayout->addWidget(btnSave);
    customGameLayout->addStretch();

    tabWidget->addTab(customGameTab, "Custom Game");

    // Setup World Editor Tab
    QWidget *worldEditorTab = new QWidget();
    QVBoxLayout *worldEditorLayout = new QVBoxLayout(worldEditorTab);

    QLabel *worldEditorLabel = new QLabel("World Editor (RPG Event Sheet)...", worldEditorTab);
    QPushButton *btnOpenEvent = new QPushButton("Open Visual Event Sheet", worldEditorTab);

    worldEditorLayout->addWidget(worldEditorLabel);
    worldEditorLayout->addWidget(btnOpenEvent);
    worldEditorLayout->addStretch();

    tabWidget->addTab(worldEditorTab, "World Editor");

    // Setup Generative AI Tab
    QWidget *aiTab = new QWidget();
    QVBoxLayout *aiLayout = new QVBoxLayout(aiTab);

    QLabel *aiLabel = new QLabel("Generative AI Hook Interface", aiTab);
    QPushButton *btnGenSprite = new QPushButton("Text-to-Sprite", aiTab);
    QPushButton *btnGenTile = new QPushButton("Text-to-Tileset", aiTab);

    aiLayout->addWidget(aiLabel);
    aiLayout->addWidget(btnGenSprite);
    aiLayout->addWidget(btnGenTile);
    aiLayout->addStretch();

    tabWidget->addTab(aiTab, "Generative AI");
}
