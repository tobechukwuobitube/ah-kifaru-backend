import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';
import app from '../index';
import BaseRepository from '../repository/base.repository';
import { createUser, createArticle, generateArticle } from './utils/helpers';
import {
  articleSample,
  articleSample2,
  articleWithNoTitle
} from './mockdata/articledata';
import db from '../database/models';
import helper from '../helpers/utils';

const ARTICLES_API = '/api/v1/articles';

chai.use(chaiHttp);

const server = () => chai.request(app);

describe('PATCH api/v1/articles/bookmark', () => {
  beforeEach(async () => {
    await db.Bookmark.destroy({ cascade: true, truncate: true });
    await db.User.destroy({ cascade: true, truncate: true });
    await db.Article.destroy({ cascade: true, truncate: true });
  });
  it('should bookmark an article', async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();
    const theArticle = await createArticle(
      await generateArticle({ authorId: secondUser.id })
    );
    const numberOfArticles = await BaseRepository.findItAll(db.Article);
    const numberOfBookmarks = await BaseRepository.findAndCountAll(
      db.Bookmark,
      {
        userId: firstUser.id
      }
    );
    const token = helper.jwtSigner(firstUser);
    expect(numberOfArticles.length).to.equal(1);
    expect(numberOfBookmarks.count).to.equal(0);

    const res = await server()
      .patch(`${ARTICLES_API}/bookmark`)
      .set('token', token)
      .send({ articleId: theArticle.id });
    expect(res.status).to.equal(200);
    expect(res.body.message).to.equal('Article Bookmarked successfully');

    const allUserBookmarks = await BaseRepository.findAll(db.Bookmark, {
      userId: firstUser.id
    });
    expect(allUserBookmarks.length).to.equal(1);
    expect(allUserBookmarks[0].articleId).to.equal(theArticle.id);
  });

  it('should remove a bookmark', async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();
    const theArticle = await createArticle(
      await generateArticle({ authorId: secondUser.id })
    );
    await BaseRepository.create(db.Bookmark, {
      userId: firstUser.id,
      articleId: theArticle.id
    });
    const numberOfBookmarks = await BaseRepository.findAll(db.Bookmark, {
      userId: firstUser.id
    });

    const token = helper.jwtSigner(firstUser);
    expect(numberOfBookmarks.length).to.equal(1);

    const res = await server()
      .patch(`${ARTICLES_API}/unbookmark`)
      .set('token', token)
      .send({ articleId: theArticle.id });
    expect(res.status).to.equal(200);

    const currentNumberOfBookmarks = await BaseRepository.findAll(db.Bookmark, {
      userId: firstUser.id
    });

    expect(currentNumberOfBookmarks.length).to.equal(0);
  });
});

describe('PATCH api/v1/articles/bookmark', () => {
  beforeEach(async () => {
    await db.Bookmark.destroy({ cascade: true, truncate: true });
    await db.User.destroy({ cascade: true, truncate: true });
  });

  it('should get all bookmarks for a user', async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();
    const theArticle = await createArticle(
      await generateArticle({ authorId: secondUser.id })
    );
    const numberOfBookmarks = await BaseRepository.findAll(db.Bookmark, {
      userId: firstUser.id
    });
    expect(numberOfBookmarks.length).to.equal(0);
    await BaseRepository.create(db.Bookmark, {
      userId: firstUser.id,
      articleId: theArticle.id
    });
    const newNumberOfBookmarks = await BaseRepository.findAll(db.Bookmark, {
      userId: firstUser.id
    });
    expect(newNumberOfBookmarks.length).to.equal(1);

    const token = helper.jwtSigner(firstUser);

    const res = await server()
      .get(`${ARTICLES_API}/bookmark`)
      .set('token', token);
    expect(res.status).to.equal(200);

    expect(res.body.message[0].articleId).to.equal(theArticle.id);
    expect(res.body.message[0].secondUser).to.equal(theArticle.userId);
  });

  it('should get no bookmarks for the user', async () => {
    const firstUser = await createUser();

    const numberOfBookmarks = await BaseRepository.findAndCountAll(
      db.Bookmark,
      {
        userId: firstUser.id
      }
    );
    expect(numberOfBookmarks.count).to.equal(0);

    const token = helper.jwtSigner(firstUser);

    const res = await server()
      .patch(`${ARTICLES_API}/bookmark`)
      .set('token', token);
    expect(res.status).to.equal(400);

    const newNumberOfBookmarks = await BaseRepository.findAndCountAll(
      db.Bookmark,
      {
        userId: firstUser.id
      }
    );
    expect(newNumberOfBookmarks.count).to.equal(0);
  });
});

describe('GET api/v1/articles', () => {
  beforeEach(async () => {
    await db.Article.destroy({ cascade: true, truncate: true });
    await db.User.destroy({ cascade: true, truncate: true });
  });

  it('should get a list of all articles', async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();
    const theArticle = await createArticle(
      await generateArticle({ authorId: secondUser.id })
    );

    const numberOfArticles = await BaseRepository.findAndCountAll(db.Article);
    const token = helper.jwtSigner(firstUser);
    expect(numberOfArticles.count).to.equal(1);

    const res = await server()
      .get(`${ARTICLES_API}`)
      .set('token', token);
    expect(res.status).to.equal(200);
    expect(res.body.data).to.be.an('array');
    expect(res.body.data).to.have.lengthOf(1);
    expect(res.body.data[0].id).to.equal(theArticle.id);
    expect(res.body.data[0].authorId).to.equal(secondUser.id);
    expect(res.body.data[0].title).to.equal(theArticle.title);
    expect(res.body.data[0].body).to.equal(theArticle.body);
    expect(res.body.data[0].image).to.equal(theArticle.image);
  });

  it('should list articles with pagaination', async () => {
    const firstUser = await createUser();
    await createArticle(await generateArticle({ authorId: firstUser.id }));
    await createArticle(await generateArticle({ authorId: firstUser.id }));
    await createArticle(await generateArticle({ authorId: firstUser.id }));
    await createArticle(await generateArticle({ authorId: firstUser.id }));
    await createArticle(await generateArticle({ authorId: firstUser.id }));

    const numberOfArticles = await BaseRepository.findAndCountAll(db.Article);
    const token = helper.jwtSigner(firstUser);
    expect(numberOfArticles.count).to.equal(5);
    const page = 2;
    const limit = 2;
    const res = await server()
      .get(`${ARTICLES_API}?page=${page}&limit=${limit}`)
      .set('token', token);
    expect(res.status).to.equal(200);
    expect(res.body.data).to.be.an('array');
    expect(res.body.metadata.prev).to.equal(`${ARTICLES_API}?page=1&limit=2`);
    expect(res.body.metadata.currentPage).to.equal(2);
    expect(res.body.metadata.next).to.equal(`${ARTICLES_API}?page=3&limit=2`);
    expect(res.body.metadata.totalPages).to.equal(3);
    expect(res.body.metadata.totalItems).to.equal(5);
  });

  it('should return error if database error occurs', done => {
    const findAllStub = sinon.stub(BaseRepository, 'findAndCountAll');
    findAllStub.rejects();
    const userUrl = '/api/v1/articles';
    chai
      .request(app)
      .get(userUrl)
      .end((err, res) => {
        expect(res.status).to.equal(500);
        findAllStub.restore();
        done();
      });
  });
});
describe('POST/GET/PUT/DELETE ACTIVITIES ON ARTICLES CONTROLLER', () => {
  const token = helper.jwtSigner({
    id: 2,
    username: 'Grace',
    email: 'grace@grace.com'
  });

  describe('POST /api/v1/articles', () => {
    beforeEach(async () => {
      await db.Bookmark.destroy({ cascade: true, truncate: true });
      await db.User.destroy({ cascade: true, truncate: true });
      await db.Article.destroy({ cascade: true, truncate: true });
    });
    it('should create article successfully with valid user input', async () => {
      const response = await chai
        .request(app)
        .post(ARTICLES_API)
        .set('x-access-token', token)
        .send(articleSample);
      expect(response.status).to.equal(201);
      expect(response.body.data).to.have.property('id');
      expect(response.body.data.id).to.be.a('number');
      expect(response.body.data).to.have.property('title');
      expect(response.body.data.title).to.equal(articleSample.title);
      expect(response.body.data).to.have.property('description');
      expect(response.body.data.description).to.equal(
        articleSample.description
      );
      expect(response.body.data).to.have.property('body');
      expect(response.body.data.body).to.equal(articleSample.body);
      expect(response.body.data).to.have.property('image');
      expect(response.body.data.image).to.equal(articleSample.image);
      expect(response.body.data).to.have.property('slug');
      expect(response.body.data).to.have.property('authorId');
      expect(response.body.data).to.have.property('publishedDate');
      expect(response.body.data).to.have.property('createdAt');
      expect(response.body.data).to.have.property('updatedAt');
    });

    it('should throw a 500 server error when creating an article without a title', async () => {
      const response = await chai
        .request(app)
        .post(ARTICLES_API)
        .set('x-access-token', token)
        .send(articleWithNoTitle);
      expect(response.status).to.equal(500);
      expect(response.message).to.equal(response.message);
    });
  });

  describe('GET /api/v1/artices', () => {
    beforeEach(async () => {
      await db.Bookmark.destroy({ cascade: true, truncate: true });
      await db.User.destroy({ cascade: true, truncate: true });
      await db.Article.destroy({ cascade: true, truncate: true });
    });

    let articles;
    beforeEach(async () => {
      articles = await BaseRepository.create(db.Article, articleSample);
      articles = await BaseRepository.create(db.Article, articleSample2);
      articles = await BaseRepository.findAll(db.Article);
    });

    it('should fetch all successfully created articles', async () => {
      const response = await chai
        .request(app)
        .get(ARTICLES_API)
        .set('x-access-token', token);
      expect(response.body.data.length).to.equal(articles.length);
      expect(response.status).to.equal(200);
      expect(response.body.data[0]).to.have.property('id');
      expect(response.body.data[0].id).to.be.a('number');
      expect(response.body.data[0]).to.have.property('title');
      expect(response.body.data[0].title).to.equal(articleSample.title);
      expect(response.body.data[0]).to.have.property('description');
      expect(response.body.data[0].description).to.equal(
        articleSample.description
      );
      expect(response.body.data[0]).to.have.property('body');
      expect(response.body.data[0].body).to.equal(articleSample.body);
      expect(response.body.data[0]).to.have.property('image');
      expect(response.body.data[0].image).to.equal(articleSample.image);
      expect(response.body.data[0]).to.have.property('slug');
      expect(response.body.data[0].slug).to.not.equal(
        response.body.data[1].slug
      );
      expect(response.body.data[0]).to.have.property('authorId');
      expect(response.body.data[0]).to.have.property('publishedDate');
      expect(response.body.data[0]).to.have.property('createdAt');
      expect(response.body.data[0]).to.have.property('updatedAt');
    });
  });

  describe('GET /api/v1/articles/:articleId', () => {
    beforeEach(async () => {
      await db.Bookmark.destroy({ cascade: true, truncate: true });
      await db.User.destroy({ cascade: true, truncate: true });
      await db.Article.destroy({ cascade: true, truncate: true });
    });

    it('should successfully get a specific article', async () => {
      const validArticle = await BaseRepository.create(
        db.Article,
        articleSample
      );
      const response = await chai
        .request(app)
        .get(`${ARTICLES_API}/${validArticle.id}`)
        .set('x-access-token', token);
      expect(response.body.data).to.have.property('id');
      expect(response.body.data.id).to.equal(validArticle.id);
      expect(response.body.data.id).to.be.a('number');
      expect(response.body.data).to.have.property('title');
      expect(response.body.data.title).to.equal(articleSample.title);
      expect(response.body.data).to.have.property('description');
      expect(response.body.data.description).to.equal(
        articleSample.description
      );
      expect(response.body.data).to.have.property('body');
      expect(response.body.data.body).to.equal(articleSample.body);
      expect(response.body.data).to.have.property('image');
      expect(response.body.data.image).to.equal(articleSample.image);
      expect(response.body.data).to.have.property('slug');
      expect(response.body.data).to.have.property('authorId');
      expect(response.body.data).to.have.property('publishedDate');
      expect(response.body.data).to.have.property('createdAt');
      expect(response.body.data).to.have.property('updatedAt');
    });

    it('should throw a 404 error when a specific article is not found', async () => {
      const validArticle = await BaseRepository.create(
        db.Article,
        articleSample
      );
      const response = await chai
        .request(app)
        .get(`${ARTICLES_API}/000010000100`)
        .set('x-access-token', token)
        .send(!validArticle);
      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal(
        'The requested article was not found'
      );
    });
  });

  describe('PUT /api/v1/articles/:articleId', () => {
    beforeEach(async () => {
      await db.Bookmark.destroy({ cascade: true, truncate: true });
      await db.User.destroy({ cascade: true, truncate: true });
      await db.Article.destroy({ cascade: true, truncate: true });
    });
    it('should successfully update a specific article', async () => {
      const validArticle = await BaseRepository.create(
        db.Article,
        articleSample
      );
      const response = await chai
        .request(app)
        .put(`${ARTICLES_API}/${validArticle.id}`)
        .set('x-access-token', token)
        .send({
          title: articleSample.title,
          description: articleSample.description,
          body: articleSample.body,
          image: articleSample.image
        });
      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Article successfully updated');
      expect(response.body.data).to.have.property('id');
      expect(response.body.data.id).to.be.a('number');
      expect(response.body.data).to.have.property('title');
      expect(response.body.data.title).to.equal(articleSample.title);
      expect(response.body.data).to.have.property('description');
      expect(response.body.data.description).to.equal(
        articleSample.description
      );
      expect(response.body.data).to.have.property('body');
      expect(response.body.data.body).to.equal(articleSample.body);
      expect(response.body.data).to.have.property('image');
      expect(response.body.data.image).to.equal(articleSample.image);
      expect(response.body.data).to.have.property('slug');
      expect(response.body.data.slug).to.equal(articleSample.slug);
      expect(response.body.data).to.have.property('authorId');
      expect(response.body.data).to.have.property('publishedDate');
      expect(response.body.data).to.have.property('createdAt');
      expect(response.body.data).to.have.property('updatedAt');
    });

    it('should throw a 404 error when a specific article is not found', async () => {
      const validArticle = await BaseRepository.create(
        db.Article,
        articleSample
      );
      const response = await chai
        .request(app)
        .get(`${ARTICLES_API}/000010000100`)
        .set('x-access-token', token)
        .send(!validArticle);
      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal(
        'The requested article was not found'
      );
    });
  });

  describe('DELETE /api/v1/articles/:articleId', () => {
    beforeEach(async () => {
      await db.Bookmark.destroy({ cascade: true, truncate: true });
      await db.User.destroy({ cascade: true, truncate: true });
      await db.Article.destroy({ cascade: true, truncate: true });
    });
    it('should successfully delete an article', async () => {
      const validArticle = await BaseRepository.create(
        db.Article,
        articleSample
      );
      const response = await chai
        .request(app)
        .delete(`${ARTICLES_API}/${validArticle.id}`)
        .set('x-access-token', token);
      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Article successfully deleted');
    });

    it('should throw a 404 error when a specific article is not found', async () => {
      const validArticle = await BaseRepository.create(
        db.Article,
        articleSample
      );
      const response = await chai
        .request(app)
        .get(`${ARTICLES_API}/000010000100`)
        .set('x-access-token', token)
        .send(!validArticle);
      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal(
        'The requested article was not found'
      );
    });
  });
});