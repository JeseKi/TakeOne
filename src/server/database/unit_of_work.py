from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

class UnitOfWork:
    """
    工作单元模式实现，用于管理数据库事务
    
    使用方法:
    ```python
    async with UnitOfWork(db) as uow:
        # 执行数据库操作，传入uow.transaction
        await crud_function(db, data, transaction=uow.transaction)
    ```
    
    如果在with块中发生异常，事务会自动回滚
    否则，事务会自动提交
    """
    def __init__(self, db: AsyncSession):
        self.db = db
        self.transaction = None
    
    async def __aenter__(self):
        """开始事务"""
        self.transaction = await self.db.begin()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """结束事务，如果有异常则回滚，否则提交"""
        if exc_type:
            logger.warning(f"事务回滚，异常: {exc_type.__name__}: {exc_val}")
            try:
                await self.transaction.rollback()
            except Exception as e:
                logger.warning(f"回滚事务时发生错误: {str(e)}")
        else:
            try:
                await self.transaction.commit()
            except Exception as e:
                logger.warning(f"提交事务时发生错误: {str(e)}")
                # 如果是ResourceClosedError，我们可以忽略它，因为事务可能已经被提交或回滚
                if "ResourceClosedError" not in str(e) and "This transaction is closed" not in str(e):
                    raise
    
    async def commit(self):
        """手动提交事务"""
        if self.transaction:
            await self.transaction.commit()
            self.transaction = None
    
    async def rollback(self):
        """手动回滚事务"""
        if self.transaction:
            await self.transaction.rollback()
            self.transaction = None
    
    async def begin_nested(self):
        """创建嵌套事务（保存点）"""
        if self.transaction:
            # 在异步SQLAlchemy中，我们需要使用connection的begin_nested方法
            connection = await self.db.connection()
            return await connection.begin_nested()
        return None
