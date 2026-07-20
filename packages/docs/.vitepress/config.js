import { defineConfig } from 'vitepress'

export default defineConfig({
    title: 'Meteor3D SDK',
    description: '轻量级 3D 场景 SDK 文档',
    lang: 'zh-CN',

    themeConfig: {
        logo: '/meteor-min.svg',

        nav: [
            { text: '指南', link: '/guide/getting-started' },
            { text: 'API', link: '/api/' },
            { text: '示例', link: '/examples/' },
            { text: '官网', link: 'https://www.meteor3d.cn' }
        ],

        sidebar: {
            '/guide/': [
                {
                    text: '入门',
                    items: [
                        { text: '快速开始', link: '/guide/getting-started' },
                        { text: '安装', link: '/guide/installation' }
                    ]
                }
            ],
            '/api/': [
                {
                    text: 'API 参考',
                    items: [
                        { text: '概览', link: '/api/' },
                        { text: '事件与状态', link: '/api/events' },
                        { text: '场景加载', link: '/api/scene-loading' },
                        { text: '相机与生命周期', link: '/api/lifecycle' },
                        { text: '性能监控', link: '/api/stats' },
                        { text: '辅助显示', link: '/api/helpers' },
                        { text: 'GIS 功能', link: '/api/gis' },
                        { text: '标签系统', link: '/api/labels' },
                        { text: '对象显隐', link: '/api/visibility' },
                        { text: '描边效果', link: '/api/outline' },
                        { text: '高亮效果', link: '/api/highlight' },
                        { text: '天气效果', link: '/api/weather' }
                    ]
                }
            ],
            '/examples/': [
                {
                    text: '示例',
                    items: [
                        { text: '基础示例', link: '/examples/' }
                    ]
                }
            ]
        },

        socialLinks: [
            { icon: 'github', link: 'https://github.com/niconicocw/Meteor3D' }
        ],

        footer: {
            message: 'Meteor3D SDK 文档',
            copyright: 'Copyright © 2024'
        },

        search: {
            provider: 'local'
        }
    }
})
