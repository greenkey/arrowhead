import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateEngine, TemplateData } from './template-engine';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;
  let mockPlugin: unknown;

  beforeEach(() => {
    mockPlugin = {
      app: {
        vault: {
          getAbstractFileByPath: vi.fn().mockReturnValue(null),
          cachedRead: vi.fn()
        }
      }
    };
    engine = new TemplateEngine(mockPlugin);
  });

  describe('render', () => {
    it('should render simple placeholders', async () => {
      const template = '<h1>{{title}}</h1><p>{{content}}</p>';
      const data: TemplateData = {
        title: 'Hello',
        content: 'World'
      };
      
      const result = await engine.render(template, data);
      
      expect(result).toContain('<h1>Hello</h1>');
      expect(result).toContain('<p>World</p>');
    });

    it('should render conditionals', async () => {
      const template = '{{#if description}}<p>{{description}}</p>{{/if}}';
      const dataWithDesc: TemplateData = {
        title: 'Test',
        content: 'Content',
        description: 'A description'
      };
      const dataWithoutDesc: TemplateData = {
        title: 'Test',
        content: 'Content'
      };
      
      const resultWithDesc = await engine.render(template, dataWithDesc);
      const resultWithoutDesc = await engine.render(template, dataWithoutDesc);
      
      expect(resultWithDesc).toContain('<p>A description</p>');
      expect(resultWithoutDesc).toBe('');
    });

    it('should render loops', async () => {
      const template = '<ul>{{#each posts}}<li>{{title}}</li>{{/each}}</ul>';
      const data: TemplateData = {
        title: 'Test',
        content: 'Content',
        posts: [
          { title: 'Post 1', url: '/post1', date: '2024-01-01', tags: [], excerpt: 'Excerpt 1' },
          { title: 'Post 2', url: '/post2', date: '2024-01-02', tags: [], excerpt: 'Excerpt 2' }
        ]
      };
      
      const result = await engine.render(template, data);
      
      expect(result).toContain('<li>Post 1</li>');
      expect(result).toContain('<li>Post 2</li>');
    });

    it('should handle missing placeholders gracefully', async () => {
      const template = '<h1>{{title}}</h1><p>{{nonexistent}}</p>';
      const data: TemplateData = {
        title: 'Hello',
        content: 'World'
      };
      
      const result = await engine.render(template, data);
      
      expect(result).toContain('<h1>Hello</h1>');
      expect(result).toContain('{{nonexistent}}');
    });
  });

  describe('loadTemplate', () => {
    it('should load default template', async () => {
      const template = await engine.loadTemplate('default');
      
      expect(template).toContain('<!DOCTYPE html>');
      expect(template).toContain('{{title}}');
      expect(template).toContain('{{content}}');
    });

    it('should load minimal template', async () => {
      const template = await engine.loadTemplate('minimal');
      
      expect(template).toContain('<!DOCTYPE html>');
      expect(template).toContain('{{content}}');
    });

    it('should load notebook template', async () => {
      const template = await engine.loadTemplate('notebook');
      
      expect(template).toContain('<!DOCTYPE html>');
      expect(template).toContain('notebook-container');
    });

    it('should cache template after first load', async () => {
      await engine.loadTemplate('default');
      const cached = engine.getCachedTemplate();
      
      expect(cached).toContain('<!DOCTYPE html>');
    });

    it('should return cached template on subsequent calls', async () => {
      const template1 = await engine.loadTemplate('default');
      const template2 = await engine.loadTemplate('default');
      
      expect(template1).toBe(template2);
    });
  });

  describe('TemplateData interface', () => {
    it('should accept posts array', async () => {
      const template = '{{#each posts}}<a href="{{url}}">{{title}}</a>{{/each}}';
      const data: TemplateData = {
        title: 'Index',
        content: '',
        posts: [
          { title: 'Post 1', url: '/post1', date: '2024-01-01', tags: ['tag1'], excerpt: 'First post' },
          { title: 'Post 2', url: '/post2', date: '2024-01-02', tags: ['tag2'], excerpt: 'Second post' }
        ]
      };
      
      const result = await engine.render(template, data);
      
      expect(result).toContain('href="/post1"');
      expect(result).toContain('>Post 1<');
      expect(result).toContain('href="/post2"');
      expect(result).toContain('>Post 2<');
    });

    it('should accept allPages array', async () => {
      const template = '{{#each allPages}}<a href="{{url}}">{{title}}</a>{{/each}}';
      const data: TemplateData = {
        title: 'Sitemap',
        content: '',
        allPages: [
          { title: 'Home', url: '/' },
          { title: 'About', url: '/about' }
        ]
      };
      
      const result = await engine.render(template, data);
      
      expect(result).toContain('href="/"');
      expect(result).toContain('>Home<');
      expect(result).toContain('href="/about"');
      expect(result).toContain('>About<');
    });

    it('should accept siteTitle and siteDescription', async () => {
      const template = '<title>{{siteTitle}}</title><meta name="description" content="{{siteDescription}}">';
      const data: TemplateData = {
        title: 'Page Title',
        content: '',
        siteTitle: 'My Site',
        siteDescription: 'A great site'
      };
      
      const result = await engine.render(template, data);
      
      expect(result).toContain('<title>My Site</title>');
      expect(result).toContain('content="A great site"');
    });
  });
});
